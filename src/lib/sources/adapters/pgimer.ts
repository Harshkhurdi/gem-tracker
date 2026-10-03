import { load } from "cheerio";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";
import type { ParsedDocument } from "@/types/specification";
import { SourceHttp, officialUrl } from "../http";
import { runAdapter } from "../result";
import { parseIndianDate, dayOnly, closingDeadlineTimestamp } from "../../tender/dates";
import { classifyMedical } from "../../tender/classifier";
import { genericPriorityCandidate, priorityCategories, priorityRank } from "../../config/priority-equipment";
import { fetchDocument } from "../../specification/documents";
import { extractSpecifications } from "../../specification/extract";

const origin = "https://pgimer.edu.in";
export const PGIMER_LIST = `${origin}/PGIMER_PORTAL/PGIMERPORTAL/Tender/JSP/View_Catg.jsp?mode=tenderDate_down`;
const source = { sourceId: "pgimer-notices", sourceName: "PGIMER institutional notices", sourceUrl: PGIMER_LIST };
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const key = (text: string) => clean(text).toLowerCase();

function portalUrl(href: string, base = PGIMER_LIST): string | undefined {
  const url = officialUrl(href, base);
  if (!url || new URL(url).origin !== origin) return;
  return url;
}

export function parsePgimerListing(html: string, fetchedAt: string): RawTender[] {
  const $ = load(html.replace(/<!--[\s\S]*?-->/g, ""));
  const records = new Map<string, RawTender>();
  $("tr").each((_, row) => {
    const cells = $(row).children("td");
    if (cells.length !== 4 || !/^\d+$/.test(cells.eq(0).text().trim())) return;
    const link = cells.eq(1).find("a[href]").first();
    const url = portalUrl(link.attr("href") || "");
    if (!url || !/\/(?:tenderViewNew|TENDER_VIEW)\.jsp$/i.test(new URL(url).pathname)) return;
    const id = new URL(url).searchParams.get("tenderId");
    const title = clean(link.text());
    if (!id || !/^\d+$/.test(id) || !title) return;
    const date = clean(cells.eq(2).text());
    records.set(id, {
      ...source, id: `pgimer-notice-${id}`, title, tenderUrl: url,
      region: "Chandigarh", institutionId: "pgimer", procurementScope: "institution",
      tenderCategory: clean(cells.eq(3).text()),
      originalClosingDate: parseIndianDate(date, dayOnly(date)),
      datePrecision: dayOnly(date) ? "day" : "minute", verification: "listing", fetchedAt,
      cancelled: /\b(?:nit\s+)?cancellation notice\b/i.test(title),
      notes: ["Official PGIMER institutional notice; a portal Active label alone does not establish a current deadline."],
    });
  });
  if (!records.size) throw Error("PGIMER institutional listing structure changed");
  return [...records.values()];
}

/** Follow only title-specific links exposed by the current official detail page. */
export function applyPgimerDetail(raw: RawTender, html: string): void {
  const $ = load(html.replace(/<!--[\s\S]*?-->/g, ""));
  const fields = new Map<string, string>();
  $("tr").each((_, row) => {
    const cells = $(row).children("td");
    if (cells.length === 2) fields.set(key(cells.eq(0).text()).replace(/\s*[:-]+\s*$/, ""), clean(cells.eq(1).text()));
  });
  if (key(fields.get("tender title") || "") !== key(raw.title)) throw Error("PGIMER detail identity differs from its listing");
  const status = fields.get("status") || "";
  if (/^cancelled|^canceled/i.test(status)) raw.cancelled = true;
  if (/^withdrawn/i.test(status)) raw.withdrawn = true;
  const deadline = fields.get("last date of submission");
  if (deadline && parseIndianDate(deadline, dayOnly(deadline))) {
    raw.originalClosingDate = parseIndianDate(deadline, dayOnly(deadline));
    raw.datePrecision = dayOnly(deadline) ? "day" : "minute";
  }
  const documents = new Map<string, { label: string; url: string }>();
  $("a[href]").each((_, link) => {
    const url = portalUrl($(link).attr("href") || "", raw.tenderUrl);
    if (!url) return;
    const parsed = new URL(url);
    if (parsed.pathname !== "/PGIMER_PORTAL/AbstractFilePath" || parsed.searchParams.get("PathKey") !== "TENDER_PATH" ||
        parsed.searchParams.get("FileType") !== "E" || !/\.pdf$/i.test(parsed.searchParams.get("FileName") || "")) return;
    documents.set(url, { label: clean($(link).text()) || "Official PGIMER document", url });
  });
  raw.documents = [...documents.values()];
  raw.corrigenda = raw.documents.filter((d) => /corrigendum|amendment/i.test(d.label)).map((d) => ({ title: d.label, url: d.url }));
  raw.verification = "detail";
}

function isBatch(raw: RawTender): boolean {
  return /PI\s*\(\s*EP\s*\)\s*\/?\s*\d{2}-\d{2}/i.test(raw.title) &&
    /global tender enquiry|e-tender notice/i.test(raw.title) && /purchase|procurement/i.test(raw.tenderCategory || "");
}

function batchReference(text: string): string | undefined {
  const match = text.match(/PI\s*\(\s*EP\s*\)\s*\/?\s*(\d{2})\s*-\s*(\d{2})\s*[/-]\s*(?:(G)\s*[/-]\s*)?(\d+)\b/i);
  return match ? `PI(EP)/${match[1]}-${match[2]}/${match[3] ? "G/" : ""}${match[4]}` : undefined;
}

/** Item-level submission dates; never propagate a batch date or a bid-opening time. */
export function pgimerBatchItems(raw: RawTender, document: ParsedDocument): RawTender[] {
  if (document.status !== "parsed") return [];
  const text = document.pages.map((page) => page.text).join("\n");
  const reference = text.match(/(?:E-Tender|Global Tender Enquiry)\s+Notice\s+No\.?\s*:?\s*(PI\s*\(EP\)\/\d{2}-\d{2}\/(?:G\/)?\d+)/i)?.[1].replace(/\s/g, "");
  if (!reference || batchReference(raw.title) !== batchReference(reference) || !/Postgraduate Institute of Medical Education (?:and|&) Research,? Chandigarh/i.test(text) ||
      !/Equipment\s*\/\s*Item Name/i.test(text) || !/Bid submission Date/i.test(text)) return [];
  const records: RawTender[] = [];
  let prior: string | undefined;
  const published = parseIndianDate(text.match(/^Date:\s*(.+)$/im)?.[1] || "");
  const seen = new Set<number>();
  for (const page of document.pages) for (const line of page.text.split(/\r?\n/)) {
    const fields = line.split(/\s*\|\s*|\t+/).map(clean);
    if (!/^\d+[.]?$/.test(fields[0])) continue;
    const number = Number(fields[0].replace(/\.$/, ""));
    if (seen.has(number)) continue;
    if (fields.length !== 7 || number < 1 || number > 100 || !fields[1] || !/^\d+\s*(?:Nos?\.?|Sets?\.?|Units?\.?)$/i.test(fields[2])) {
      prior = undefined;
      continue;
    }
    seen.add(number);
    const closing = /^-?do-?$/i.test(fields[4]) ? prior : parseIndianDate(fields[4], true);
    // An unreadable explicit date breaks ditto inheritance for subsequent rows.
    prior = closing;
    const item: RawTender = {
      ...raw, id: `${raw.id}-item-${number}`, tenderId: undefined, title: fields[1],
      referenceNumber: `${reference}/${String(number).padStart(2, "0")}`, department: fields[6],
      publishDate: published, documentProductScope: fields[1],
      description: `Equipment/Item Name: ${fields[1]}\nQuantity: ${fields[2]}\nDepartment: ${fields[6]}`,
      originalClosingDate: raw.corrigenda?.length ? undefined : closing,
      extendedClosingDate: undefined,
      // Batch attachments stay in documents. Their deadlines and cancellation
      // labels must not become item-level status without applicability review.
      corrigenda: undefined,
      datePrecision: "day", verification: "listing", cancelled: raw.cancelled, withdrawn: raw.withdrawn,
      notes: [...(raw.notes || []),
        `Item ${number} in the official ${reference} notice, PDF page ${page.page}; equipment and dates are specific to this row.`,
        "Only a submission calendar date is published; the listed opening time is not a confirmed submission time. Separate CPPP amendments and full technical documents require official verification.",
        ...(document.textMethod === "reviewed-scan" ? ["Scanned notice excerpts were visually checked; exact official URL and fresh PDF SHA-256 must match before this review can be used."] : []),
        ...(raw.corrigenda?.length ? ["Batch amendments require item-specific deadline review; the closing date remains unknown."] : []),
      ],
    };
    const categories = priorityCategories(item);
    // Batch inventory is scoped per item before either classification or extraction.
    if (!categories.length) continue;
    item.specification = extractSpecifications([{ ...document, pages: [{ page: page.page, text: item.description! }], productText: fields[1] }], categories);
    item.specification.extractionStatus = "partial";
    item.specification.notes.push("Reviewed item-list evidence only; full item-specific technical specifications have not been extracted.");
    records.push(item);
  }
  return records;
}

export const pgimerAdapter: TenderSourceAdapter = {
  id: source.sourceId, name: source.sourceName, url: PGIMER_LIST,
  regions: ["Chandigarh"], institutionIds: ["pgimer"],
  async fetch() {
    return runAdapter(pgimerAdapter, async () => {
      const http = new SourceHttp({ budgetMs: 80000, timeoutMs: 14000 });
      const records = parsePgimerListing(await http.text(PGIMER_LIST), new Date().toISOString());
      const now = Date.now();
      const candidates = records.filter((raw) => !raw.cancelled && !raw.withdrawn &&
        (!raw.originalClosingDate || closingDeadlineTimestamp(raw.originalClosingDate) >= now) &&
        (isBatch(raw) || classifyMedical(raw.title, raw.title, raw).isMedical || genericPriorityCandidate(raw)))
        .sort((a, b) => Number(isBatch(b)) - Number(isBatch(a)) || priorityRank(b) - priorityRank(a));
      let partial = candidates.length > 12, inspected = 0, items = 0, detailFailures = 0;
      const notes = ["Official PGIMER institutional notices supplement CPPP and GeM. Institutional listing status is not proof of an active deadline."];
      for (const raw of candidates.slice(0, 12)) {
        try {
          applyPgimerDetail(raw, await http.text(raw.tenderUrl!));
          inspected++;
          if (!isBatch(raw)) continue;
          const primary = raw.documents?.find((d) => !/corrigendum|amendment/i.test(d.label));
          if (!primary) { partial = true; continue; }
          const document = await fetchDocument(http, { ...primary, type: "tender-document", status: "deferred" });
          const expanded = pgimerBatchItems(raw, document);
          if (expanded.length) { records.push(...expanded); items += expanded.length; }
          else { partial = true; notes.push(`Generic notice ${raw.id}: no safely readable item-level priority evidence; it was not promoted to a priority opportunity.`); }
        } catch { partial = true; detailFailures++; }
      }
      notes.push(`${records.length - items} listing notices read; ${inspected} current medical/generic details inspected; ${items} priority items established from their own official rows; ${detailFailures} detail reads incomplete.`);
      notes.push("Scans without hash-matched reviewed excerpts remain unreadable. Only item-specific submission dates establish deadlines; linked batch amendments are not propagated to other items.");
      return { records, notes, partial };
    });
  },
};
