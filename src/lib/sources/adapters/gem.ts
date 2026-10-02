import { load } from "cheerio";
import type { RawTender, Region, TenderSourceAdapter } from "@/types/tender";
import { institutions } from "../../config/institutions";
import { genericPriorityCandidate, priorityRank } from "../../config/priority-equipment";
import { parseIndianDate } from "../../tender/dates";
import { classifyMedical } from "../../tender/classifier";
import { matchInstitutions } from "../../tender/institution-matcher";
import { productEvidence } from "../../tender/product-evidence";
import { SourceHttp } from "../http";
import { runAdapter } from "../result";

const origin = "https://bidplus.gem.gov.in";
// Share a small request pool across all regions so a refresh does not burst
// eighteen simultaneous searches against the public portal.
let activeRequests = 0;
const waitingRequests: (() => void)[] = [];
async function gemRequest<T>(work: () => Promise<T>): Promise<T> {
  if (activeRequests >= 4) await new Promise<void>((resolve) => waitingRequests.push(resolve));
  else activeRequests++;
  try { return await work(); }
  finally {
    const next = waitingRequests.shift();
    if (next) next();
    else activeRequests--;
  }
}
export const GEM_SEARCH_PAGE = `${origin}/advance-search`;
type GemDocument = Record<string, unknown>;
const scalar = (value: unknown): string => {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
};
const clean = (value: string) => load(`<div>${value}</div>`)("div").text().replace(/\s+/g, " ").trim();

/** GeM's UI formats these Z-suffixed fields in UTC to display Indian wall time.
 * They are NOT UTC instants. Match the official UI rather than shifting deadlines 5.5h. */
export function gemListingDate(value: unknown): string | undefined {
  const date = scalar(value);
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(date) || !Number.isFinite(Date.parse(date))) return;
  return parseIndianDate(date.replace(/(?:\.\d+)?Z$/, ""));
}
export function parseGemSearchPage(data: unknown): { total: number; start: number; docs: GemDocument[] } {
  const x = data as { code?: unknown; response?: { response?: { numFound?: unknown; start?: unknown; docs?: unknown } } };
  const page = x?.response?.response;
  if (x?.code !== 200 || !page || !Number.isSafeInteger(page.numFound) || Number(page.numFound) < 0 ||
      !Number.isSafeInteger(page.start) || Number(page.start) < 0 || !Array.isArray(page.docs) ||
      page.docs.some((d) => !d || typeof d !== "object" || !/^GEM\/20\d{2}\/[BR]\/\d+$/.test(scalar(d.b_bid_number)) || !/^\d+$/.test(scalar(d.b_id)))) {
    throw Error("Official GeM search response structure changed");
  }
  return { total: Number(page.numFound), start: Number(page.start), docs: page.docs };
}
export function gemListingRecord(doc: GemDocument, region: Region, sourceId: string, fetchedAt: string): RawTender {
  const id = scalar(doc.b_id), type = Number(scalar(doc.b_bid_type));
  // Paths and internal IDs are taken from the official page's link construction.
  const path = type === 5 ? "showdirectradocumentPdf" : type === 2
    ? Number(scalar(doc.b_eval_type)) > 0 ? "list-ra-schedules" : "showradocumentPdf"
    : "showbidDocument";
  const item = clean(scalar(doc.b_category_name));
  const title = [item, clean(scalar(doc.bbt_title))].filter(Boolean).join(" — ");
  const scope = clean(scalar(doc.bd_category_name)) || item;
  return {
    title, description: scope, documentProductScope: [scope, title].join("\n"),
    region, sourceId, sourceName: `GeM direct / ${region}`, sourceUrl: GEM_SEARCH_PAGE,
    tenderUrl: `${origin}/${path}/${id}`, tenderId: scalar(doc.b_bid_number),
    department: clean(scalar(doc.ba_official_details_deptName)),
    organisationChain: [clean(scalar(doc.ba_official_details_minName)), clean(scalar(doc.ba_official_details_deptName))].filter(Boolean),
    publishDate: gemListingDate(doc.final_start_date_sort),
    // Current search index includes extensions; an original PDF must never replace this date.
    extendedClosingDate: gemListingDate(doc.final_end_date_sort), datePrecision: "minute",
    cancelled: [3, 5].includes(Number(scalar(doc.b_status))),
    documents: path === "list-ra-schedules" ? [] : [{ label: "Official GeM bid document", url: `${origin}/${path}/${id}` }],
    verification: "listing", fetchedAt,
    notes: ["Current closing date from the official GeM public search index; GeM says updates may take up to 15 minutes to appear."],
  };
}

function buyerField(text: string, label: string, next: string): string {
  const flat = text.replace(/[^\x20-\x7e\n]/g, " ").replace(/\s+/g, " ");
  const part = flat.split(label)[1]?.split(next)[0];
  return part?.replace(/^[ /]+|[ /]+$/g, "").trim() || "";
}
export function enrichGemBuyer(raw: RawTender, text: string): boolean {
  const ids = text.match(/GEM\s*\/\s*20\d{2}\s*\/\s*[BR]\s*\/\s*\d+/gi)?.map((s) => s.replace(/\s/g, "").toUpperCase()) || [];
  if (!ids.includes(raw.tenderId!)) return false;
  const organisation = buyerField(text, "Organisation Name", "Office Name");
  const office = buyerField(text, "Office Name", "Contact details");
  const consigneeBlocks = [...text.matchAll(/Consignees\s*\/\s*Reporting Officer and Quantity([\s\S]*?)(?=Technical Specifications|Buyer Added Bid Specific|Consignees\s*\/\s*Reporting Officer and Quantity|$)/gi)]
    .map((m) => m[1].split(/Technical Specifications|Buyer Added Bid Specific/)[0]).join(" ").replace(/\s+/g, " ");
  const buyer = `${organisation} ${office}`.replace(/\(aiims\)/gi, " ");
  let matches = matchInstitutions(`${buyer} ${consigneeBlocks}`, raw.region);
  if (/All India Institute Of Medical Sciences/i.test(organisation))
    matches = [...matches, ...matchInstitutions(`AIIMS ${office}`, raw.region)];
  raw.organisation = organisation;
  raw.location = [office, consigneeBlocks].filter(Boolean).join(" ");
  raw.consignees = [...new Map(matches.map((i) => [i.id, { institutionId: i.id, name: i.shortName }])).values()];
  if (raw.consignees.length === 1) raw.institutionId = raw.consignees[0].institutionId;
  const scope = productEvidence(text);
  if (scope) {
    raw.documentProductScope = scope.slice(0, 28000);
    raw.description = scope.slice(0, 28000);
  }
  raw.notes!.push("Buyer and consignee scope checked in the matching official GeM document. Current search deadline takes precedence over the original document.");
  // The listing is current, but separate cancellation notices are not exhaustively checked.
  return true;
}

export function createGemAdapter(region: Region): TenderSourceAdapter {
  const id = region === "Chandigarh" ? "gem-direct" : `gem-direct-${region === "Punjab" ? "punjab" : "himachal"}`;
  const adapter: TenderSourceAdapter = {
    id, name: `GeM direct / ${region}`, url: GEM_SEARCH_PAGE, regions: [region],
    institutionIds: institutions.filter((i) => i.region === region).map((i) => i.id),
    async fetch() {
      const result = await runAdapter(adapter, async () => {
        const http = new SourceHttp({ budgetMs: 90000, timeoutMs: 16000 });
        const html = await gemRequest(() => http.text(GEM_SEARCH_PAGE));
        // The public page exposes this form field. Keep it in this in-memory session only.
        const token = html.match(/['"]csrf_bd_gem_nk['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
        if (!token || !html.includes(`${origin}/search-bids`)) throw Error("Official GeM public search is unavailable");
        const fetchedAt = new Date().toISOString(), notes: string[] = [];
        let partial = false, received = 0;
        const docs = new Map<string, GemDocument>();
        let searchRequests = 0;
        const search = async (page: number, date = "", buyerState = "") => {
          if (++searchRequests > 400) throw Error("GeM regional search request limit reached");
          return parseGemSearchPage(JSON.parse(await gemRequest(() => http.text(`${origin}/search-bids`, {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: GEM_SEARCH_PAGE },
          body: new URLSearchParams({ csrf_bd_gem_nk: token, payload: JSON.stringify(buyerState ? { searchType: "ministry-search", ministry: "", buyerState, organization: "", department: "", bidEndFromMin: "", bidEndToMin: "", page } : { searchType: "con", state_name_con: region, city_name_con: "", bidEndFromCon: date, bidEndToCon: date, page }) }),
        }))));
        };
        const first = await search(1);
        const collect = (page: Awaited<ReturnType<typeof search>>, expectedStart: number, expectedTotal = first.total) => {
          if (page.start !== expectedStart || page.total !== expectedTotal || (!page.docs.length && expectedStart < expectedTotal)) partial = true;
          received += page.docs.length;
          for (const d of page.docs) docs.set(scalar(d.b_id), d);
        };
        collect(first, 0);
        // Walk every reported page, not a fixed 'latest N' slice. Guard a corrupt count.
        const pages = Math.ceil(first.total / 10), maximum = Math.min(pages, 500);
        if (pages > maximum) partial = true;
        let nextPage = 2;
        await Promise.all(Array.from({ length: 6 }, async () => {
          while (nextPage <= maximum) {
            const p = nextPage++;
            try { collect(await search(p), (p - 1) * 10); }
            catch { partial = true; notes.push(`GeM result page ${p} could not be read; coverage is incomplete.`); }
          }
        }));
        if (docs.size < first.total && received === first.total) {
          // GeM broad searches can repeat a bid across page boundaries. Re-query
          // smaller closing-date groups instead of silently accepting the missing slice.
          const dates = [...new Set([...docs.values()].map((d) => gemListingDate(d.final_end_date_sort)?.slice(0, 10)).filter((d): d is string => !!d))];
          let dateCursor = 0;
          await Promise.all(Array.from({ length: 6 }, async () => {
            while (dateCursor < dates.length) {
              const date = dates[dateCursor++].split("-").reverse().join("-");
              try {
                const bucket = await search(1, date);
                collect(bucket, 0, bucket.total);
                const bucketPages = Math.min(Math.ceil(bucket.total / 10), 500);
                if (bucket.total > 5000) partial = true;
                for (let page = 2; page <= bucketPages; page++) collect(await search(page, date), (page - 1) * 10, bucket.total);
              } catch { partial = true; notes.push("Some GeM closing-date recovery searches could not be read."); }
            }
          }));
          notes.push("Repeated broad-search records were supplemented with closing-date group searches.");
        }
        if (docs.size !== first.total) partial = true;
        notes.unshift(`Regional GeM search: ${docs.size} unique bids read from ${pages} reported pages (${first.total} reported bids).`);
        // Buyer-state search is a distinct public form option. It catches regional
        // health procurement missed by unstable consignee-page boundaries, with
        // at most 20 additional result pages per region.
        try {
          const list = JSON.parse(await gemRequest(() => http.text(`${origin}/ministry-list-adv`, {
            method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: GEM_SEARCH_PAGE },
            body: new URLSearchParams({ csrf_bd_gem_nk: token }),
          }))) as { status?: number; data?: { BuyerStateList?: string[] } };
          if (list.status !== 200 || !Array.isArray(list.data?.BuyerStateList)) throw Error("GeM buyer state list changed");
          const state = list.data.BuyerStateList.find((s) => s.toLowerCase() === region.toLowerCase());
          if (state) {
            const buyer = await search(1, "", state);
            const buyerIds = new Set<string>();
            const addBuyer = (page: Awaited<ReturnType<typeof search>>, start: number) => {
              if (page.total !== buyer.total || page.start !== start) partial = true;
              for (const d of page.docs) { buyerIds.add(scalar(d.b_id)); docs.set(scalar(d.b_id), d); }
            };
            addBuyer(buyer, 0);
            const buyerPages = Math.min(Math.ceil(buyer.total / 10), 20);
            for (let page = 2; page <= buyerPages; page++) addBuyer(await search(page, "", state), (page - 1) * 10);
            if (buyerIds.size !== buyer.total) partial = true;
            notes.push(`State-government buyer search: ${buyerIds.size} unique bids read of ${buyer.total}; capped at 20 result pages.`);
          }
        } catch { partial = true; notes.push("Bounded state-government buyer search was incomplete."); }
        const candidates = [...docs.values()].filter((d) => scalar(d.b_is_inactive) !== "1")
          .map((d) => gemListingRecord(d, region, id, fetchedAt))
          .filter((r) => classifyMedical(r.title + "\n" + r.description, r.documentProductScope || r.title, r).isMedical || genericPriorityCandidate(r))
          .sort((a, b) => priorityRank(b) - priorityRank(a));
        const buyerHttp = new SourceHttp({ budgetMs: 60000, timeoutMs: 14000 });
        let cursor = 0;
        const records: RawTender[] = [];
        await Promise.all(Array.from({ length: 6 }, async () => {
          while (cursor < candidates.length) {
            const raw = candidates[cursor++];
            const text = raw.documents?.[0] && await gemRequest(() => buyerHttp.documentText(raw.documents![0].url));
            const checked = !!text && enrichGemBuyer(raw, text);
            if (!checked) { partial = true; raw.notes!.push("Buyer document could not be checked; only an explicitly regional health department can be retained without institutional attribution."); }
            // A regional delivery address alone does not make an unrelated buyer a monitored hospital.
            const regionalHealth = /health(?:\s*(?:and|&)\s*family welfare| department| services)|medical education/i.test(raw.department || "") && new RegExp(region, "i").test(raw.department || "");
            if (!raw.consignees?.length && !regionalHealth) continue;
            if (!raw.consignees?.length) raw.procurementScope = "statewide";
            records.push(raw);
          }
        }));
        notes.push(`Medical candidates: ${candidates.length}; retained monitored institutions or regional health procurement: ${records.length}.`,
          "Public regional search supplements hospital mirrors. Protected documents, portal outages, generic unclassified titles and changing listings can still leave gaps; incomplete reads are marked partial.");
        return { records, notes: [...new Set(notes)], partial };
      });
      return result;
    },
  };
  return adapter;
}
