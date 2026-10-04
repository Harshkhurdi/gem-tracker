import { regions } from "../../config/regions";
import { institutions } from "../../config/institutions";
import { priorityCategories, priorityRank, genericPriorityCandidate } from "../../config/priority-equipment";
import { enrichGemBuyer, gemListingRecord, gemPriorityRegions, gemRequest, parseGemSearchPage, isExplicitRegionalHealthDepartment } from "./gem";
import { SourceHttp } from "../http";
import { runAdapter } from "../result";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";

// Terms use the public full-text form. Additional state words do not reliably
// narrow this search, so geography must be established independently from PDFs.
export const PRIORITY_KEYWORD_GROUPS = [
  ["VENTILATORS", ["ventilator", "mechanical ventilation"]],
  ["ULTRASOUND", ["ultrasound", "doppler"]],
  ["DEFIBRILLATORS", ["defibrillator"]],
  ["HOSPITAL_BEDS", ["hospital bed"]],
  ["ENDOSCOPY", ["endoscopy", "laryngoscope", "bronchoscope"]],
  ["MAMMOGRAPHY", ["mammography", "mamography"]],
  ["DIGITAL_RADIOGRAPHY", ["digital radiography", "digital x ray", "mobile dr"]],
  ["C_ARM", ["c arm"]],
  ["INFUSION_PUMPS", ["syringe pump", "infusion pump"]],
  ["PATIENT_MONITORS", ["multiparameter", "multipara monitor", "patient monitor", "vital sign monitor"]],
  ["PATIENT_WARMING", ["patient warming", "fluid warmer"]],
  ["OT_LIGHTS", ["ot light", "operation theatre light"]],
  ["ANAESTHESIA", ["anaesthesia machine", "anesthesia machine"]],
] as const;
const pageUrl = "https://bidplus.gem.gov.in/all-bids";
const endpoint = "https://bidplus.gem.gov.in/all-bids-data";
export const gemPriorityAdapter: TenderSourceAdapter = {
  id: "gem-priority-keywords", name: "GeM / priority equipment keyword sweep", url: pageUrl,
  regions: [...regions], institutionIds: institutions.map((i) => i.id),
  fetch: () => runAdapter(gemPriorityAdapter, async () => {
    const http = new SourceHttp({ budgetMs: 45000, timeoutMs: 14000 });
    const until = Date.now() + 45000;
    const html = await gemRequest(() => http.text(pageUrl));
    const token = html.match(/['"]csrf_bd_gem_nk['"]\s*:\s*['"]([^'"]+)['"]/)?.[1];
    if (!token || !html.includes(endpoint)) throw Error("Public GeM keyword form unavailable");
    let requests = 0, partial = false;
    const notes: string[] = [];
    const docs = new Map<string, Record<string, unknown>>();
    const queries = PRIORITY_KEYWORD_GROUPS.flatMap(([group, terms]) => terms.map((term) => ({ group, term, total: 0, ids: new Set<string>(), page: 1, failed: false })));
    const search = async (query: typeof queries[number]) => {
      if (Date.now() >= until || requests >= 140) throw Error("Priority keyword search budget exhausted");
      requests++;
      const payload = { param: { searchBid: query.term, searchType: "fullText" }, filter: {
        bidStatusType: "ongoing_bids", byType: "all", highBidValue: "", byEndDate: { from: "", to: "" }, sort: "Bid-End-Date-Oldest",
      }, ...(query.page > 1 ? { page: query.page } : {}) };
      const result = parseGemSearchPage(JSON.parse(await gemRequest(() => http.text(endpoint, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest", Referer: pageUrl },
        body: new URLSearchParams({ csrf_bd_gem_nk: token, payload: JSON.stringify(payload) }),
      }))));
      if (query.page === 1) query.total = result.total;
      if (result.total !== query.total || result.start !== (query.page - 1) * 10) partial = true;
      for (const doc of result.docs) {
        const id = String(Array.isArray(doc.b_id) ? doc.b_id[0] : doc.b_id);
        docs.set(id, doc); query.ids.add(id);
      }
      query.page++;
    };
    // Read every equipment term's first page before spending time on deep pages.
    for (let page = 1; page <= 50 && Date.now() < until && requests < 140; page++) {
      const pending = queries.filter((q) => !q.failed && q.page === page && (page === 1 || (q.ids.size < q.total && q.page <= Math.ceil(q.total / 10))));
      if (!pending.length) break;
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
        while (next < pending.length) {
          const query = pending[next++];
          try { await search(query); } catch { query.failed = true; partial = true; }
        }
      }));
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
    const buyerHttp = new SourceHttp({ budgetMs: 60000, timeoutMs: 14000 });
    const documentUntil = Date.now() + 60000;
    const records: RawTender[] = [];
    // Regional government departments are considered first. Rotate the other
    // national candidates by equipment group so the same outside-state prefix
    // cannot consume every refresh's verification window.
    const direct = candidates.filter((r) => localScore(r) === 100);
    const groups = new Map<string, RawTender[]>();
    for (const raw of candidates.filter((r) => localScore(r) < 100)) {
      const group = priorityCategories(raw)[0] || "GENERIC";
      groups.set(group, [...(groups.get(group) || []), raw]);
    }
    const bucket = Math.floor(Date.now() / 900000);
    const queues = [...groups.values()].map((list) => [...list.slice(bucket % list.length), ...list.slice(0, bucket % list.length)]);
    const queue = [...direct];
    for (let i = 0; queues.some((q) => i < q.length); i++) for (const group of queues) if (group[i]) queue.push(group[i]);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (cursor < queue.length && cursor < 160 && Date.now() < documentUntil) {
        const raw = queue[cursor++];
        const text = raw.documents?.[0] && await gemRequest(() => buyerHttp.documentText(raw.documents![0].url));
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
    notes.push(`Priority-only keyword sweep: ${docs.size} unique public bids; ${candidates.length} product candidates; ${cursor}/${queue.length} buyer documents attempted; ${records.length} regional government healthcare records retained. A national keyword hit alone is never regional ownership evidence.`);
    return { records, partial, notes };
  }),
};
