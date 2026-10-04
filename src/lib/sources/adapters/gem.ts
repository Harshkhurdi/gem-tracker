import { load } from "cheerio";
import type { RawTender, Region, TenderSourceAdapter } from "@/types/tender";
import { institutions } from "../../config/institutions";
import { regions, gemSourceIds } from "../../config/regions";
import { genericPriorityCandidate, priorityRank } from "../../config/priority-equipment";
import { parseIndianDate } from "../../tender/dates";
import { classifyMedical } from "../../tender/classifier";
import { matchInstitutions } from "../../tender/institution-matcher";
import { productEvidence } from "../../tender/product-evidence";
import { SourceHttp, isGemEmptySearchResponse } from "../http";
import { runAdapter } from "../result";

const origin = "https://bidplus.gem.gov.in";
import { gemRequest } from "../gem-request-pool";
import { gemBuyerDocumentText } from "../gem-buyer-documents";
export { gemRequest } from "../gem-request-pool";
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
  if (isGemEmptySearchResponse(data)) return { total: 0, start: 0, docs: [] };
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

const excludedHealthBuyer = /\b(?:private|pvt|charitable|trust|veterinary|animal husbandry|animal health|horticulture)\b/i;
const publicHealthAuthority = /\b(?:department (?:of )?health|health (?:and family welfare|department|services|systems?)|medical education|national health mission|state health society|medical services corporation|directorate of (?:health|medical)|civil surgeon|chief medical officer)\b/i;
const publicHealthFacility = /\b(?:(?:government|govt|civil|district|regional|zonal|sub divisional|sub district)\s+(?:(?:medical|dental|ayurvedic|ayush|mental|general|multi specialty|multi speciality)\s+)*hospital|(?:government|govt)\s+(?:medical|dental|ayurvedic|ayush|pharmaceutical|public health)\s+(?:college|institute)|community health cent(?:re|er)|primary health cent(?:re|er)|health sub cent(?:re|er)|ayushman arogya mandir|aam aadmi clinic|esi[cs]? (?:model )?hospital)\b/i;

const normalizeRegionName = (text: string) => text.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
function namesRegion(text: string, region: Region): boolean {
  const value = normalizeRegionName(text);
  // Chandigarh-area addresses can be physically in either neighbouring state.
  if (region === "Chandigarh" && /\b(?:new chandigarh|mohali|sas nagar|sahibzada ajit singh nagar|panchkula|chandimandir|haryana|punjab)\b/i.test(value)) return false;
  return new RegExp(`\\b${region.replace(/ /g, "\\s+")}\\b`, "i").test(value);
}

/** A state-search hit is not location/ownership evidence by itself. */
export function isExplicitRegionalHealthDepartment(raw: RawTender): boolean {
  const department = raw.department || "";
  return !excludedHealthBuyer.test(department) && publicHealthAuthority.test(department) && namesRegion(department, raw.region);
}

function retainUnlistedPublicHealthBuyer(raw: RawTender, organisation: string, office: string, consignees: string, documentAuthority: string): boolean {
  const buyer = `${organisation} ${office}`;
  const authority = `${documentAuthority} ${raw.department || ""} ${(raw.organisationChain || []).join(" ")}`;
  if (excludedHealthBuyer.test(`${buyer} ${authority}`)) return false;
  const governmentAuthority = /\b(?:department (?:of )?health|health department|directorate of (?:health|medical)|director (?:of )?health|national health mission|state health society|health systems? corporation|medical services corporation|civil surgeon|chief medical officer)\b/i.test(buyer);
  const structuredHealthAuthority = publicHealthAuthority.test(authority) && /\b(?:ministry|department|directorate|government|administration)\b/i.test(authority);
  const isHealthcare = governmentAuthority || publicHealthFacility.test(buyer) ||
    (structuredHealthAuthority && publicHealthAuthority.test(buyer));
  // Defence/railway procurement needs both a healthcare office and a matching
  // government administrative authority, rather than an Army buyer alone.
  const governmentMedicalService = /\b(?:military|army|railway|air force)\s+hospital\b/i.test(buyer) &&
    /\b(?:ministry of defence|department of military affairs|ministry of railways|indian railways)\b/i.test(authority);
  if (!isHealthcare && !governmentMedicalService) return false;
  const regionalAuthority = publicHealthAuthority.test(authority) && namesRegion(authority, raw.region);
  const regionalAddress = namesRegion(office, raw.region) || namesRegion(consignees, raw.region);
  if (!regionalAuthority && !regionalAddress) return false;
  raw.procurementScope = "statewide";
  raw.buyer = [organisation, office].filter(Boolean).join(" — ").slice(0, 400);
  raw.notes!.push("Government healthcare buyer and regional scope verified in the matching GeM document; facility is not yet individually mapped in the institution directory.");
  return true;
}

/** National keyword results lack a state filter. Only document delivery/buyer
 * evidence can locate them; a generic acronym such as GMCH is insufficient. */
export function gemPriorityRegions(text: string): Region[] {
  const organisation = buyerField(text, "Organisation Name", "Office Name");
  const office = buyerField(text, "Office Name", "Contact details");
  const consignees = [...text.matchAll(/Consignees\s*\/\s*Reporting Officer and Quantity([\s\S]*?)(?=Technical Specifications|Buyer Added Bid Specific|Consignees\s*\/\s*Reporting Officer and Quantity|$)/gi)].map((m) => m[1]).join(" ");
  const locate = (value: string) => {
    const named = regions.filter((region) => namesRegion(value, region));
    if (/\b(?:new chandigarh|mullanpur|mohali|sas nagar)\b/i.test(value) && !named.includes("Punjab")) named.push("Punjab");
    if (named.length) return named;
    const normalized = " " + normalizeRegionName(value) + " ";
    return [...new Set(institutions.filter((i) => [i.name, i.shortName, ...i.aliases].some((alias) => {
      const key = normalizeRegionName(alias), city = normalizeRegionName(i.city);
      return key.length > 10 && key.includes(city) && normalized.includes(" " + key + " ");
    })).map((i) => i.region))];
  };
  const delivery = locate(consignees);
  if (delivery.length) return delivery;
  // A stated outside-region delivery is not replaced with a buyer headquarters.
  if (/\b(?:delhi|maharashtra|gujarat|chhattisgarh|uttar pradesh|ladakh|assam|bihar|tamil nadu|kerala|karnataka|telangana|andhra pradesh|west bengal|odisha|madhya pradesh|rajasthan|jharkhand)\b/i.test(consignees)) return [];
  return locate(`${organisation} ${office}`);
}

export function enrichGemBuyer(raw: RawTender, text: string): boolean {
  const ids = text.match(/GEM\s*\/\s*20\d{2}\s*\/\s*[BR]\s*\/\s*\d+/gi)?.map((s) => s.replace(/\s/g, "").toUpperCase()) || [];
  if (!ids.includes(raw.tenderId!)) return false;
  const organisation = buyerField(text, "Organisation Name", "Office Name");
  const office = buyerField(text, "Office Name", "Contact details");
  const documentAuthority = [buyerField(text, "Ministry/State Name", "Department Name"), buyerField(text, "Department Name", "Organisation Name")].filter(Boolean).join(" ");
  const consigneeBlocks = [...text.matchAll(/Consignees\s*\/\s*Reporting Officer and Quantity([\s\S]*?)(?=Technical Specifications|Buyer Added Bid Specific|Consignees\s*\/\s*Reporting Officer and Quantity|$)/gi)]
    .map((m) => m[1].split(/Technical Specifications|Buyer Added Bid Specific/)[0]).join(" ").replace(/\s+/g, " ");
  const buyer = `${organisation} ${office}`.replace(/\(aiims\)/gi, " ");
  let matches = matchInstitutions(`${buyer} ${consigneeBlocks}`, raw.region);
  if (/All India Institute Of Medical Sciences/i.test(organisation))
    matches = [...matches, ...matchInstitutions(`AIIMS ${office}`, raw.region)];
  raw.organisation = organisation;
  // Consignee pages remain matching evidence, not a user-facing address.
  raw.location = office.slice(0, 160) || undefined;
  raw.consignees = [...new Map(matches.map((i) => [i.id, { institutionId: i.id, name: i.shortName }])).values()];
  if (raw.consignees.length === 1) raw.institutionId = raw.consignees[0].institutionId;
  if (!raw.consignees.length) retainUnlistedPublicHealthBuyer(raw, organisation, office, consigneeBlocks, documentAuthority);
  const scope = productEvidence(text);
  if (scope) {
    raw.documentProductScope = scope.slice(0, 28000);
    raw.description = scope.slice(0, 28000);
  }
  raw.notes!.push("Buyer and consignee scope checked in the matching official GeM document. Current search deadline takes precedence over the original document.");
  // The listing is current, but separate cancellation notices are not exhaustively checked.
  return true;
}

/** Select only returned human-health/monitored-buyer names; the PDF still decides attribution. */
export function selectGemOrganisations(values: unknown, region: Region, stateScoped: boolean): string[] {
  if (!Array.isArray(values) || values.length > 2000 || values.some((v) => typeof v !== "string" || v.length > 500))
    throw Error("Official GeM organisation list structure changed");
  const seen = new Set<string>();
  return (values as string[]).filter((name) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key) || excludedHealthBuyer.test(name) || /\banimal\b/i.test(name)) return false;
    // The central root is deliberately PGIMER-only. Generic campus names or
    // short aliases (e.g. GMCH) cannot justify a nationwide organisation query.
    const monitored = stateScoped ? matchInstitutions(name, region).length > 0
      : region === "Chandigarh" && /\b(?:post graduate institute of medical education and research|pgimer)\b/i.test(name) && /\bchandigarh\b/i.test(name);
    const regionalHealth = stateScoped && (publicHealthAuthority.test(name) || publicHealthFacility.test(name) ||
      /\b(?:medical college|institute of medical scien(?:ce|ces)|university of health sciences)\b/i.test(name));
    const phsc = stateScoped && region === "Punjab" && /^Punjab Health Systems? Corporation$/i.test(name.trim());
    if (!monitored && !regionalHealth && !phsc) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => Number(!!matchInstitutions(b, region).length) - Number(!!matchInstitutions(a, region).length));
}

export function createGemAdapter(region: Region): TenderSourceAdapter {
  const id = gemSourceIds[region];
  // GeM's public state-list-adv dropdown uses an ampersand for this UT.
  const consigneeState = region === "Jammu and Kashmir" ? "JAMMU & KASHMIR" : region;
  const adapter: TenderSourceAdapter = {
    id, name: `GeM direct / ${region}`, url: GEM_SEARCH_PAGE, regions: [region],
    institutionIds: institutions.filter((i) => i.region === region).map((i) => i.id),
    async fetch() {
      const result = await runAdapter(adapter, async () => {
        const searchDeadline = Date.now() + 90000;
        const http = new SourceHttp({ budgetMs: 90000, timeoutMs: 16000 });
        const html = await gemRequest(() => http.text(GEM_SEARCH_PAGE));
        // The public page exposes this form field. Keep it in this in-memory session only.
        const token = html.match(/['"]csrf_bd_gem_nk['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
        if (!token || !html.includes(`${origin}/search-bids`)) throw Error("Official GeM public search is unavailable");
        const fetchedAt = new Date().toISOString(), notes: string[] = [];
        let partial = false;
        const docs = new Map<string, GemDocument>();
        const regionalIds = new Set<string>();
        let searchRequests = 0;
        const canSearch = () => Date.now() < searchDeadline && searchRequests < 400;
        const search = async (page: number, date = "", buyerState = "", ministry = "", organization = "", priority = false) => {
          if (!canSearch()) throw Error("GeM search request or time limit reached");
          searchRequests++;
          return parseGemSearchPage(JSON.parse(await gemRequest(() => http.text(`${origin}/search-bids`, {
          method: "POST", allowGemEmptyResult: true, headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: GEM_SEARCH_PAGE },
          body: new URLSearchParams({ csrf_bd_gem_nk: token, payload: JSON.stringify(buyerState || ministry ? { searchType: "ministry-search", ministry, buyerState, organization, department: "", bidEndFromMin: "", bidEndToMin: "", page } : { searchType: "con", state_name_con: consigneeState, city_name_con: "", bidEndFromCon: date, bidEndToCon: date, page }) }),
        }), priority ? "priority" : "normal")));
        };
        const first = await search(1);
        const collect = (page: Awaited<ReturnType<typeof search>>, expectedStart: number, expectedTotal = first.total) => {
          if (page.start !== expectedStart || page.total !== expectedTotal || (!page.docs.length && expectedStart < expectedTotal)) partial = true;
          for (const d of page.docs) { regionalIds.add(scalar(d.b_id)); docs.set(scalar(d.b_id), d); }
        };
        collect(first, 0);
        // Narrow official buyer queries recover entirely unseen closing-date groups.
        // Use the same total search budget; reserve no extra concurrency or PDF trust.
        let buyerInitial: { state: string; page: Awaited<ReturnType<typeof search>> } | undefined;
        let buyerList: { status?: number; data?: { BuyerStateList?: string[]; MinistryList?: string[] } } | undefined;
        try {
          if (!canSearch()) throw Error("GeM listing budget exhausted");
          buyerList = JSON.parse(await gemRequest(() => http.text(`${origin}/ministry-list-adv`, {
            method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: GEM_SEARCH_PAGE },
            body: new URLSearchParams({ csrf_bd_gem_nk: token }),
          }), "priority"));
          if (buyerList?.status !== 200 || !Array.isArray(buyerList.data?.BuyerStateList) ||
              buyerList.data.BuyerStateList.some((v) => typeof v !== "string")) throw Error("GeM buyer state list changed");
          const state = buyerList.data.BuyerStateList.find((v) => normalizeRegionName(v) === normalizeRegionName(region));
          if (state) {
            try {
              const page = await search(1, "", state, "", "", true);
              buyerInitial = { state, page };
              for (const doc of page.docs) docs.set(scalar(doc.b_id), doc);
            } catch { partial = true; notes.push("State-government buyer first page could not be read ahead of general pagination."); }
          }
          const healthMinistry = region === "Chandigarh" && buyerList.data.MinistryList?.find((v) => v === "Ministry of Health and Family Welfare");
          const roots = [state && { buyerState: state, ministry: "" }, healthMinistry && { buyerState: "", ministry: healthMinistry }].filter((v): v is { buyerState: string; ministry: string } => !!v);
          let supplementalRequests = 0, selectedCount = 0, added = 0;
          for (const root of roots) {
            if (!canSearch() || supplementalRequests >= 24 || selectedCount >= 6) { partial = true; break; }
            supplementalRequests++; searchRequests++;
            let names: string[];
            try {
              names = selectGemOrganisations(JSON.parse(await gemRequest(() => http.text(`${origin}/org-list-adv`, {
                method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: GEM_SEARCH_PAGE },
                body: new URLSearchParams({ csrf_bd_gem_nk: token, ...(root.buyerState ? { buyer_state: root.buyerState } : { ministry: root.ministry }) }),
              }), "priority")), region, !!root.buyerState);
            } catch {
              partial = true;
              notes.push(`Targeted organisation discovery for ${root.buyerState || root.ministry} was incomplete; regional records remain available and other official buyer roots are still considered.`);
              continue;
            }
            // First-page breadth across healthcare buyers precedes deeper pages.
            // The window rotates when the directory exceeds this bounded batch.
            const phsc = region === "Punjab" ? names.filter((name) => /^Punjab Health Systems? Corporation$/i.test(name.trim())) : [];
            const pinned = [...phsc, ...names.filter((name) => publicHealthAuthority.test(name) && !phsc.includes(name))].slice(0, 2);
            const remaining = names.filter((name) => !pinned.includes(name));
            const offset = remaining.length ? Math.floor(Date.now() / 900000) % remaining.length : 0;
            const selected = [...pinned, ...remaining.slice(offset), ...remaining.slice(0, offset)].slice(0, 6 - selectedCount);
            if (selected.length < names.length) partial = true;
            const batches: { name: string; total: number; ids: Set<string>; nextPage: number; failed: boolean }[] = [];
            const add = (batch: typeof batches[number], page: Awaited<ReturnType<typeof search>>, start: number) => {
              if (page.total !== batch.total || page.start !== start) partial = true;
              for (const d of page.docs) {
                const id = scalar(d.b_id); batch.ids.add(id);
                if (!docs.has(id)) added++;
                docs.set(id, d);
              }
            };
            for (const name of selected) {
              if (!canSearch() || supplementalRequests >= 24) { partial = true; break; }
              selectedCount++; supplementalRequests++;
              try {
                const initial = await search(1, "", root.buyerState, root.ministry, name, true);
                const batch = { name, total: initial.total, ids: new Set<string>(), nextPage: 2, failed: false };
                add(batch, initial, 0); batches.push(batch);
              } catch { partial = true; notes.push(`Organisation search ${name} could not be completed.`); }
            }
            for (let round = 2; round <= 8 && canSearch() && supplementalRequests < 24; round++) {
              for (const batch of batches) {
                if (batch.failed || batch.nextPage > Math.ceil(batch.total / 10)) continue;
                if (!canSearch() || supplementalRequests >= 24) { partial = true; break; }
                const page = batch.nextPage++; supplementalRequests++;
                try { add(batch, await search(page, "", root.buyerState, root.ministry, batch.name, true), (page - 1) * 10); }
                catch { batch.failed = true; partial = true; }
              }
            }
            for (const batch of batches) {
              if (batch.ids.size !== batch.total) partial = true;
              notes.push(`Organisation search ${batch.name}: ${batch.ids.size} unique bids read of ${batch.total}.`);
            }
          }
          notes.push(`Targeted organisation recovery: ${added} additional unique bids; ${supplementalRequests}/24 supplemental requests used, at most 6 organisations and 8 result pages each, healthcare first-page breadth before general pagination; larger organisation windows rotate each refresh.`);
        } catch { partial = true; notes.push("Targeted organisation discovery was incomplete; regional records remain available."); }
        // Buyer-state search is a distinct public form option. It catches regional
        // health procurement missed by unstable consignee-page boundaries, with
        // at most 20 additional result pages per region.
        try {
          if (buyerList?.status !== 200 || !Array.isArray(buyerList.data?.BuyerStateList)) throw Error("GeM buyer state list unavailable");
          const state = buyerList.data.BuyerStateList.find((s) => normalizeRegionName(s) === normalizeRegionName(region));
          if (state) {
            const buyer = buyerInitial?.state === state ? buyerInitial.page : await search(1, "", state, "", "", true);
            const buyerIds = new Set<string>();
            const addBuyer = (page: Awaited<ReturnType<typeof search>>, start: number) => {
              if (page.total !== buyer.total || page.start !== start) partial = true;
              for (const d of page.docs) { buyerIds.add(scalar(d.b_id)); docs.set(scalar(d.b_id), d); }
            };
            addBuyer(buyer, 0);
            const buyerPages = Math.min(Math.ceil(buyer.total / 10), 20);
            for (let page = 2; page <= buyerPages; page++) addBuyer(await search(page, "", state, "", "", true), (page - 1) * 10);
            if (buyerIds.size !== buyer.total) partial = true;
            notes.push(`State-government buyer search: ${buyerIds.size} unique bids read of ${buyer.total}; capped at 20 result pages.`);
          }
        } catch { partial = true; notes.push("Bounded state-government buyer search was incomplete."); }
        // Walk every reported page, not a fixed 'latest N' slice. Guard a corrupt count.
        const pages = Math.ceil(first.total / 10), maximum = Math.min(pages, 500);
        if (pages > maximum) partial = true;
        let nextPage = 2;
        await Promise.all(Array.from({ length: 6 }, async () => {
          while (nextPage <= maximum && canSearch()) {
            const p = nextPage++;
            try { collect(await search(p), (p - 1) * 10); }
            catch { partial = true; notes.push(`GeM result page ${p} could not be read; coverage is incomplete.`); }
          }
        }));
        if (nextPage <= maximum) { partial = true; notes.push("Regional GeM pagination stopped at the shared search request/time limit."); }
        if (regionalIds.size < first.total && canSearch()) {
          // Missing, failed or repeated broad pages can omit bids. Re-query
          // observed closing-date groups while the original request/time budget remains.
          const dates = [...new Set([...regionalIds].map((id) => gemListingDate(docs.get(id)!.final_end_date_sort)?.slice(0, 10)).filter((d): d is string => !!d))];
          let dateCursor = 0;
          await Promise.all(Array.from({ length: 6 }, async () => {
            while (dateCursor < dates.length && Date.now() < searchDeadline && searchRequests < 400) {
              const date = dates[dateCursor++].split("-").reverse().join("-");
              try {
                const bucket = await search(1, date);
                collect(bucket, 0, bucket.total);
                const bucketPages = Math.min(Math.ceil(bucket.total / 10), 500);
                if (bucket.total > 5000) partial = true;
                for (let page = 2; page <= bucketPages && Date.now() < searchDeadline && searchRequests < 400; page++) collect(await search(page, date), (page - 1) * 10, bucket.total);
              } catch { partial = true; notes.push("Some GeM closing-date recovery searches could not be read."); }
            }
          }));
          notes.push("Incomplete broad-search records were supplemented with closing-date group searches.");
        }
        if (regionalIds.size !== first.total) partial = true;
        notes.unshift(`Regional GeM search: ${regionalIds.size} unique bids read from ${pages} reported pages (${first.total} reported bids).`);
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
            const text = raw.documents?.[0] && await gemBuyerDocumentText(buyerHttp, raw.documents[0].url, priorityRank(raw) >= 2 ? "priority" : "normal");
            const checked = !!text && enrichGemBuyer(raw, text);
            if (!checked) { partial = true; raw.notes!.push("Buyer document could not be checked; only an explicitly regional health department can be retained without institutional attribution."); }
            // With an unreadable PDF, only an explicitly regional government
            // health department in the structured listing can establish scope.
            const regionalHealth = !text && isExplicitRegionalHealthDepartment(raw);
            if (!raw.consignees?.length && raw.procurementScope !== "statewide" && !regionalHealth) continue;
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
