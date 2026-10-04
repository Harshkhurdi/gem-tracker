import { regions } from "../../config/regions";
import { institutions } from "../../config/institutions";
import { priorityCategories, priorityRank, genericPriorityCandidate } from "../../config/priority-equipment";
import { enrichGemBuyer, gemListingRecord, gemPriorityRegions, gemRequest, parseGemSearchPage, isExplicitRegionalHealthDepartment } from "./gem";
import { SourceHttp } from "../http";
import { gemBuyerDocumentText } from "../gem-buyer-documents";
import { runAdapter } from "../result";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";

// Terms use the public full-text form. Additional state words do not reliably
// narrow this search, so geography must be established independently from PDFs.
export const PRIORITY_KEYWORD_GROUPS = [
  ["VENTILATORS", ["ventilator", "mechanical ventilation", "neonatal ventilator", "portable ventilator"]],
  ["ULTRASOUND", ["ultrasound", "doppler", "echocardiography", "ultrasonography"]],
  ["DEFIBRILLATORS", ["defibrillator", "automated external defibrillator"]],
  ["HOSPITAL_BEDS", ["hospital bed", "icu bed", "stretcher", "patient trolley"]],
  ["ENDOSCOPY", ["endoscopy", "laryngoscope", "bronchoscope", "gastroscope", "colonoscope", "flexible intubation"]],
  ["MAMMOGRAPHY", ["mammography", "mamography", "breast tomosynthesis"]],
  ["DIGITAL_RADIOGRAPHY", ["digital radiography", "digital x ray", "mobile dr", "flat panel detector", "computed radiography"]],
  ["C_ARM", ["c arm", "c-arm"]],
  ["INFUSION_PUMPS", ["syringe pump", "infusion pump"]],
  ["PATIENT_MONITORS", ["multiparameter", "multipara monitor", "patient monitor", "vital sign monitor", "central monitor", "central monitoring station"]],
  ["PATIENT_WARMING", ["patient warming", "fluid warmer", "blood warmer", "forced air warming"]],
  ["OT_LIGHTS", ["ot light", "operation theatre light", "surgical light", "shadowless light"]],
  ["ANAESTHESIA", ["anaesthesia machine", "anesthesia machine", "anaesthesia workstation", "anesthesia workstation"]],
] as const;
/** Category breadth comes before additional aliases. Rotation prevents the same
 * categories sitting at the end of every time-limited refresh. */
export function priorityKeywordPlan(bucket = Math.floor(Date.now() / 900000)) {
  const start = bucket % PRIORITY_KEYWORD_GROUPS.length;
  const groups = [...PRIORITY_KEYWORD_GROUPS.slice(start), ...PRIORITY_KEYWORD_GROUPS.slice(0, start)];
  return Array.from({ length: Math.max(...groups.map(([, terms]) => terms.length)) }, (_, i) =>
    groups.flatMap(([group, terms]) => terms[i] ? [{ group, term: terms[i] }] : [])).flat();
}
function rotateCandidates(list: RawTender[], bucket: number) {
  if (!list.length) return list;
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let stride = Math.max(1, Math.floor(280 / PRIORITY_KEYWORD_GROUPS.length));
  while (gcd(stride, list.length) !== 1) stride++;
  const offset = bucket * stride % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}
/** Hints determine scheduling only. Matching documents still determine whether
 * the bid belongs to a government healthcare buyer in a monitored region. */
export function priorityBuyerQueue(candidates: RawTender[], bucket = Math.floor(Date.now() / 900000)): RawTender[] {
  const byRegion = new Map<string, Map<string, RawTender[]>>();
  for (const raw of candidates) {
    const region = regions.find((r) => isExplicitRegionalHealthDepartment({ ...raw, region: r })) || "UNLOCATED";
    const categories = byRegion.get(region) || new Map<string, RawTender[]>();
    const category = priorityCategories(raw)[0] || "GENERIC";
    categories.set(category, [...(categories.get(category) || []), raw]);
    byRegion.set(region, categories);
  }
  const queues = [...regions, "UNLOCATED"].flatMap((region) => {
    const categories = byRegion.get(region);
    if (!categories) return [];
    const lists = [...categories.values()].map((list) => rotateCandidates(list, bucket));
    const queue: RawTender[] = [];
    for (let i = 0; lists.some((list) => i < list.length); i++) for (const list of lists) if (list[i]) queue.push(list[i]);
    return [queue];
  });
  const queue: RawTender[] = [];
  for (let i = 0; queues.some((list) => i < list.length); i++) for (const list of queues) if (list[i]) queue.push(list[i]);
  return queue;
}
const pageUrl = "https://bidplus.gem.gov.in/all-bids";
const endpoint = "https://bidplus.gem.gov.in/all-bids-data";
export const gemPriorityAdapter: TenderSourceAdapter = {
  id: "gem-priority-keywords", name: "GeM / priority equipment keyword sweep", url: pageUrl,
  regions: [...regions], institutionIds: institutions.map((i) => i.id),
  fetch: () => runAdapter(gemPriorityAdapter, async () => {
    const http = new SourceHttp({ budgetMs: 75000, timeoutMs: 14000 });
    const until = Date.now() + 75000;
    const html = await gemRequest(() => http.text(pageUrl), "priority");
    const token = html.match(/['"]csrf_bd_gem_nk['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
    if (!token || !html.includes(endpoint)) throw Error("Public GeM keyword form unavailable");
    let requests = 0, partial = false;
    const notes: string[] = [];
    const docs = new Map<string, Record<string, unknown>>();
    const queries = priorityKeywordPlan().map(({group, term}) => ({ group, term, total: 0, ids: new Set<string>(), page: 1, failed: false }));
    const search = async (query: typeof queries[number]) => {
      if (Date.now() >= until || requests >= 240) throw Error("Priority keyword search budget exhausted");
      requests++;
      const payload = { param: { searchBid: query.term, searchType: "fullText" }, filter: {
        bidStatusType: "ongoing_bids", byType: "all", highBidValue: "", byEndDate: { from: "", to: "" }, sort: "Bid-End-Date-Oldest",
      }, ...(query.page > 1 ? { page: query.page } : {}) };
      const result = parseGemSearchPage(JSON.parse(await gemRequest(() => http.text(endpoint, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: pageUrl },
        body: new URLSearchParams({ csrf_bd_gem_nk: token, payload: JSON.stringify(payload) }),
      }), "priority")));
      if (query.page === 1) query.total = result.total;
      if (result.total !== query.total || result.start !== (query.page - 1) * 10) partial = true;
      for (const doc of result.docs) {
        const id = String(Array.isArray(doc.b_id) ? doc.b_id[0] : doc.b_id);
        docs.set(id, doc); query.ids.add(id);
      }
      query.page++;
    };
    const readBatch = async (pending: typeof queries) => {
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
        while (next < pending.length) {
          const query = pending[next++];
          try { await search(query); } catch { query.failed = true; partial = true; }
        }
      }));
    };
    // Every category's primary term, then category-balanced aliases, before deep pages.
    await readBatch(queries);
    const groupCursors = new Map<string, number>();
    while (Date.now() < until && requests < 240) {
      const pending: typeof queries = [];
      for (const {group} of priorityKeywordPlan().slice(0, PRIORITY_KEYWORD_GROUPS.length)) {
        const more = queries.filter((q) => q.group === group && !q.failed && q.page > 1 && q.ids.size < q.total && q.page <= Math.min(50, Math.ceil(q.total / 10)));
        if (!more.length) continue;
        const cursor = groupCursors.get(group) || 0;
        pending.push(more[cursor % more.length]);
        groupCursors.set(group, cursor + 1);
      }
      if (!pending.length) break;
      await readBatch(pending);
    }
    for (const [group] of PRIORITY_KEYWORD_GROUPS) {
      const terms = queries.filter((q) => q.group === group);
      const complete = terms.every((q) => !q.failed && q.page > 1 && q.ids.size === q.total);
      if (!complete) partial = true;
      notes.push(`Priority keyword ${group}: ${terms.filter((q) => q.page > 1).length}/${terms.length} terms searched; ${complete ? "all reported pages read" : "partial search/pages"}.`);
    }
    const fetchedAt = new Date().toISOString();
    const localScore = (raw: RawTender) => regions.some((r) => isExplicitRegionalHealthDepartment({ ...raw, region: r })) ? 100 : /health|medical|military|railway/i.test(raw.department || "") ? 10 : 0;
    const candidates = [...docs.values()].filter((d) => String(Array.isArray(d.b_is_inactive) ? d.b_is_inactive[0] : d.b_is_inactive) !== "1")
      .map((d) => gemListingRecord(d, "Punjab", gemPriorityAdapter.id, fetchedAt))
      .filter((r) => priorityCategories(r).length || genericPriorityCandidate(r))
      .sort((a, b) => localScore(b) - localScore(a) || priorityRank(b) - priorityRank(a));
    const buyerHttp = new SourceHttp({ budgetMs: 90000, timeoutMs: 14000 });
    const documentUntil = Date.now() + 90000;
    const records: RawTender[] = [];
    const queue = priorityBuyerQueue(candidates);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (cursor < queue.length && cursor < 280 && Date.now() < documentUntil) {
        const raw = queue[cursor++];
        const text = raw.documents?.[0] && await gemBuyerDocumentText(buyerHttp, raw.documents[0].url, "priority");
        if (!text) partial = true;
        if (text && !(text.match(/GEM\s*\/\s*20\d{2}\s*\/\s*[BR]\s*\/\s*\d+/gi) || []).some((id) => id.replace(/\s/g, "").toUpperCase() === raw.tenderId)) {
          partial = true;
          continue;
        }
        const destinations = text ? gemPriorityRegions(text) : regions.filter((r) => isExplicitRegionalHealthDepartment({ ...raw, region: r }));
        for (const region of destinations) {
          const scoped = { ...raw, region, notes: [...(raw.notes || [])], sourceName: gemPriorityAdapter.name };
          if (text) {
            if (!enrichGemBuyer(scoped, text) || (!scoped.consignees?.length && scoped.procurementScope !== "statewide")) continue;
          } else {
            partial = true; scoped.procurementScope = "statewide";
            scoped.notes.push("Keyword search PDF unavailable; scope is supported only by the explicitly regional government health department. Availability remains likely.");
          }
          records.push(scoped);
        }
      }
    }));
    if (cursor < queue.length) partial = true;
    notes.push("Priority allocation: reserved request lane; category-first searches and region/category-balanced buyer verification; listing budget 75 seconds/240 requests and document budget 90 seconds/280 attempts.");
    notes.push(`Priority-only keyword sweep: ${docs.size} unique public bids; ${candidates.length} product candidates; ${cursor}/${queue.length} buyer documents attempted; ${records.length} regional government healthcare records retained. A national keyword hit alone is never regional ownership evidence.`);
    return { records, partial, notes };
  }),
};
