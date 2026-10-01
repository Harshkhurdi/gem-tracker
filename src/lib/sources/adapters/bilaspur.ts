import * as cheerio from "cheerio";
import type {
  RawTender,
  SourceFetchResult,
  TenderSourceAdapter,
} from "@/types/tender";
import {
  parseIndianDate,
  dayOnly,
  closingDeadlineTimestamp,
} from "@/lib/tender/dates";
import { classifyMedical } from "@/lib/tender/classifier";
import { SourceHttp } from "../http";

type Kind = "gem" | "cppp" | "niq";
const origin = "https://www.aiimsbilaspur.edu.in";
const paths: Record<Kind, string> = {
  gem: "/procurement/tender/gem",
  cppp: "/procurement/tender/cppp",
  niq: "/procurement/niq",
};
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const present = (s: string) => !!s && !/^[-–]+$/.test(s);
const names: Record<Kind, string> = {
  gem: "AIIMS Bilaspur GeM",
  cppp: "AIIMS Bilaspur CPPP",
  niq: "AIIMS Bilaspur NIQ",
};
function officialUrl(href: string, base: string): string | undefined {
  try {
    const u = new URL(href, base);
    if (
      u.protocol === "https:" &&
      /^(www\.)?aiimsbilaspur\.edu\.in$/.test(u.hostname)
    )
      return u.href;
  } catch {}
}

export function parseBilaspur(
  html: string,
  url: string,
  kind: Kind,
  fetchedAt: string,
): RawTender[] {
  const $ = cheerio.load(html);
  const records: RawTender[] = [];
  $("#procurementTable tbody tr, #procurementTable > tr").each((_, row) => {
    const cells = $(row).children("td");
    if (cells.length !== 9) return;
    const value = (i: number) => clean(cells.eq(i).text());
    const title = value(2);
    if (!title) return;
    const notes: string[] = [];
    const publishDate = parseIndianDate(value(4));
    let originalClosingDate = parseIndianDate(value(5), dayOnly(value(5)));
    let extendedClosingDate = parseIndianDate(value(6), dayOnly(value(6)));
    for (const [label, i, parsed] of [
      ["publication", 4, publishDate],
      ["closing", 5, originalClosingDate],
      ["extension", 6, extendedClosingDate],
    ] as const)
      if (present(value(i)) && !parsed)
        notes.push(`Invalid ${label} date in official listing: ${value(i)}`);
    if (
      publishDate &&
      originalClosingDate &&
      new Date(originalClosingDate) < new Date(publishDate)
    ) {
      notes.push(
        "Closing date precedes publication; deadline requires verification.",
      );
      originalClosingDate = undefined;
    }
    if (
      extendedClosingDate &&
      ((publishDate && new Date(extendedClosingDate) < new Date(publishDate)) ||
        (originalClosingDate &&
          new Date(extendedClosingDate) < new Date(originalClosingDate)))
    ) {
      notes.push(
        "Extended date precedes publication or original deadline; requires verification.",
      );
      extendedClosingDate = undefined;
    }
    const documents: { label: string; url: string }[] = [];
    const corrigenda: NonNullable<RawTender["corrigenda"]> = [];
    cells
      .eq(7)
      .find("a[href]")
      .each((_, a) => {
        const link = $(a);
        const documentUrl = officialUrl(link.attr("href") || "", url);
        if (!documentUrl) return;
        const label = clean(link.text()) || "Official tender document";
        documents.push({ label, url: documentUrl });
        if (/corrig|addendum|extension|cancel|withdraw/i.test(label)) {
          const metadata = clean(
            link.closest("li").length
              ? link.closest("li").text()
              : link.parent().text(),
          );
          const published = metadata.match(
            /Published Date\s*:\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
          );
          corrigenda.push({
            title: label,
            url: documentUrl,
            publishedDate: published
              ? parseIndianDate(published[1])
              : undefined,
            type: /cancel/i.test(label)
              ? "cancellation"
              : /withdraw/i.test(label)
                ? "withdrawal"
                : /extension/i.test(label)
                  ? "extension"
                  : "corrigendum",
          });
        }
      });
    if (corrigenda.length && !extendedClosingDate)
      notes.push(
        "Attached corrigendum requires review; listing has no verified extended deadline.",
      );
    const referenceNumber = present(value(1)) ? value(1) : undefined;
    const bid = (referenceNumber + " " + title)
      .match(/GEM\s*\/\s*\d{4}\s*\/\s*[A-Z]\s*\/\s*\d+/i)?.[0]
      .replace(/\s/g, "")
      .toUpperCase();
    const cppp = (referenceNumber + " " + title).match(
      /\b\d{4}_[A-Z0-9]+_\d+_\d+\b/i,
    )?.[0];
    const statusText = [
      title,
      value(8),
      ...corrigenda.map((c) => c.title),
    ].join(" ");
    records.push({
      title,
      referenceNumber,
      tenderId: bid || cppp,
      sourceId: `aiims-bilaspur-${kind}`,
      sourceName: names[kind],
      sourceUrl: url,
      tenderUrl: documents[0]?.url || url,
      region: "Himachal Pradesh",
      institutionId: "aiims-bilaspur",
      procurementScope: "institution",
      organisation: "All India Institute of Medical Sciences, Bilaspur",
      location: "Bilaspur, Himachal Pradesh",
      publishDate,
      originalClosingDate,
      extendedClosingDate,
      documents,
      corrigenda,
      verification: "listing",
      datePrecision: dayOnly(value(6) !== "-" ? value(6) : value(5))
        ? "day"
        : "minute",
      cancelled:
        /\b(cancelled|canceled|cancellation)\b/i.test(statusText) || undefined,
      withdrawn: /\b(withdrawn|withdrawal)\b/i.test(statusText) || undefined,
      notes,
      fetchedAt,
    });
  });
  return records;
}

function explicitDeadline(text: string): string | undefined {
  const pattern =
    /(?:Bid End Date\s*\/\s*Time|Bid Submission End Date(?:\s*&\s*Time)?|Last Date(?:\s*(?:and|&)\s*Time)?(?:\s*for)?\s*(?:of\s*)?Submission)\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?))?/i;
  const match = clean(text).match(pattern);
  return match
    ? parseIndianDate(`${match[1]} ${match[2] || ""}`, !match[2])
    : undefined;
}

export function createBilaspurAdapter(kind: Kind): TenderSourceAdapter {
  const id = `aiims-bilaspur-${kind}`;
  const name = names[kind];
  const url = origin + paths[kind];
  return {
    id,
    name,
    url,
    institutionIds: ["aiims-bilaspur"],
    regions: ["Himachal Pradesh"],
    async fetch(): Promise<SourceFetchResult> {
      const started = Date.now();
      const attemptedAt = new Date().toISOString();
      const http = new SourceHttp({ budgetMs: 60000, timeoutMs: 18000 });
      const records: RawTender[] = [];
      const notes: string[] = [];
      let partial = false;
      let detailChecks = 0;
      let fetchedPages = 0;
      let error: string | undefined;
      for (let page = 0; page < 2; page++) {
        const pageUrl = page ? `${url}?page=${page}` : url;
        try {
          const html = await http.text(pageUrl);
          const $ = cheerio.load(html);
          if (!$("#procurementTable").length)
            throw new Error(
              "Official procurement table missing from response.",
            );
          const pageRecords = parseBilaspur(html, pageUrl, kind, attemptedAt);
          let unreadableRows = 0;
          $("#procurementTable tbody tr, #procurementTable > tr").each(
            (_, row) => {
              const cells = $(row).children("td");
              if (!cells.length) return; // Header rows are not procurement records.
              if (
                cells.length === 1 &&
                /^(?:no (?:data|records|tenders|procurements)(?: (?:available|found))?(?: in table)?|nothing found)[.!]?$/i.test(
                  clean(cells.text()),
                )
              )
                return;
              if (cells.length !== 9 || !clean(cells.eq(2).text()))
                unreadableRows++;
            },
          );
          if (unreadableRows && !pageRecords.length)
            throw new Error(
              "Official procurement table structure changed; populated rows could not be read.",
            );
          if (unreadableRows) {
            partial = true;
            notes.push(
              `${unreadableRows} official procurement rows could not be read because their structure changed.`,
            );
          }
          fetchedPages++;
          records.push(...pageRecords);
          const nextPages = $("a[href]")
            .toArray()
            .map((a) => officialUrl($(a).attr("href") || "", pageUrl))
            .filter((u): u is string => !!u)
            .filter((u) => new URL(u).pathname === new URL(url).pathname)
            .map((u) => Number(new URL(u).searchParams.get("page") || 0));
          if (!nextPages.some((n) => n > page)) break;
          if (page === 1) {
            partial = true;
            notes.push(
              "Pagination capped at two pages; additional official records remain unchecked.",
            );
          }
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          partial = true;
          notes.push(`Page ${page + 1} unavailable: ${error}`);
          break;
        }
      }
      // Read only expressly labelled deadlines; arbitrary dates in specifications are never deadlines.
      const promising = records.filter(
        (r) =>
          classifyMedical(r.title).isMedical &&
          !r.cancelled &&
          !r.withdrawn &&
          (!r.originalClosingDate ||
            closingDeadlineTimestamp(
              r.datePrecision === "day"
                ? (r.extendedClosingDate || r.originalClosingDate)?.slice(0, 10)
                : r.extendedClosingDate || r.originalClosingDate,
            ) >= Date.now() ||
            r.corrigenda?.some((c) => c.type === "extension")),
      );
      const deferredDocuments = promising
        .slice(3)
        .filter(
          (r) =>
            r.documents?.length ||
            r.corrigenda?.some(
              (c) => /extension/i.test(c.title || "") && c.url,
            ),
        ).length;
      if (deferredDocuments) {
        partial = true;
        notes.push(
          `${deferredDocuments} relevant document checks deferred by the three-document limit.`,
        );
      }
      for (const r of promising.slice(0, 3)) {
        const correction = r.corrigenda?.find((c) =>
          /extension/i.test(c.title || ""),
        );
        const docUrl = correction?.url || r.documents?.[0]?.url;
        if (!docUrl) continue;
        detailChecks++;
        try {
          const text = await http.documentText(docUrl);
          const deadline = text ? explicitDeadline(text) : undefined;
          if (deadline) {
            if (correction) {
              r.extendedClosingDate = deadline;
              correction.revisedClosingDate = deadline;
            } else if (!r.extendedClosingDate) {
              r.originalClosingDate = deadline;
            }
            r.datePrecision = /T23:59:59/.test(deadline) ? "day" : "minute";
            // A mirror PDF verifies its published deadline, not live GeM cancellation/status.
            r.verification = "listing";
            r.notes?.push(
              "Deadline read from explicitly labelled official document field.",
            );
          } else if (correction) {
            partial = true;
            notes.push(
              "A date-extension document could not be verified; affected tender retains listing verification.",
            );
          }
        } catch {
          partial = true;
          notes.push("Some document checks failed; listing records retained.");
        }
      }
      if (records.some((r) => r.corrigenda?.length && !r.extendedClosingDate)) {
        partial = true;
        notes.push(
          "Some attached corrigenda require document review for current deadlines.",
        );
      }
      const listingAvailable = fetchedPages > 0 && !(error && !records.length);
      return {
        sourceId: id,
        sourceName: name,
        status: listingAvailable
          ? partial
            ? "PARTIAL"
            : "SUCCESS"
          : "UNAVAILABLE",
        records,
        attemptedAt,
        successfulAt: listingAvailable ? new Date().toISOString() : undefined,
        error,
        notes,
        metrics: {
          rawRecords: records.length,
          institutionMatches: 0,
          medicalMatches: 0,
          falsePositivesRejected: 0,
          unassignedRejected: 0,
          detailChecks,
        },
        durationMs: Date.now() - started,
      };
    },
  };
}
