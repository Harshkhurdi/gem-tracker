import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGemAdapter,
  enrichGemBuyer,
  GEM_SEARCH_PAGE,
  gemListingDate,
  gemListingRecord,
  selectGemOrganisations,
} from "../src/lib/sources/adapters/gem";
import { SourceHttp } from "../src/lib/sources/http";
import { normalizeTender } from "../src/lib/tender/normalize";
import type { Region } from "../src/types/tender";
import { gemSourceIds, regions } from "../src/lib/config/regions";

const pageHtml = `<script>var token = {'csrf_bd_gem_nk':'public-session'}; var url='https://bidplus.gem.gov.in/search-bids';</script>`;
const pgimer = "Post Graduate Institute Of Medical Education And Research Chandigarh";
const slbs = "Shri Lal Bahadur Shastri Government Medical College";
function doc(number = "7885248", id = "9718972", item = "ICU ventilator", end = "2026-10-20T16:00:00Z") {
  return {
    b_bid_number: [`GEM/2026/B/${number}`], b_id: [id], b_bid_type: [0],
    b_category_name: [item], bd_category_name: [item],
    ba_official_details_deptName: ["Department of Higher Education"],
    final_start_date_sort: "2026-09-01T14:00:00Z", final_end_date_sort: end,
  };
}
type Doc = ReturnType<typeof doc>;
function pdf(d: Doc, organisation = pgimer, office = "Chandigarh", extra = "") {
  return `Bid Details\nBid Number ${d.b_bid_number[0]}\nOrganisation Name / ${organisation}\nOffice Name / ${office}\nContact details\nItem Category\n${d.b_category_name[0]}\nGeMARPTS\n${extra}`;
}
function response(docs: Doc[], total = docs.length, start = 0) {
  return JSON.stringify({ code: 200, response: { response: { numFound: total, start, docs } } });
}
function mockSearch(pages: Record<number, string | Error>, region: Region = "Chandigarh") {
  return vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
    if (url === GEM_SEARCH_PAGE) return pageHtml;
    if (url.endsWith("/org-list-adv")) return "[]";
    if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: [] } });
    expect(url).toBe("https://bidplus.gem.gov.in/search-bids");
    expect(init?.method).toBe("POST");
    const form = new URLSearchParams(init?.body as URLSearchParams);
    expect(form.get("csrf_bd_gem_nk")).toBe("public-session");
    const payload = JSON.parse(form.get("payload")!);
    expect(payload.state_name_con).toBe(region === "Jammu and Kashmir" ? "JAMMU & KASHMIR" : region);
    const value = pages[payload.page];
    if (!value || value instanceof Error) throw value || Error("Unexpected page");
    return value;
  });
}

describe("official GeM regional discovery", () => {
  afterEach(() => vi.restoreAllMocks());

  it("walks every reported regional page and finds priority bids beyond page one", async () => {
    const pages = Array.from({ length: 21 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    const search = mockSearch({ 1: response(pages.slice(0, 10), 21), 2: response(pages.slice(10, 20), 21, 10), 3: response(pages.slice(20), 21, 20) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(pages.find((d) => url.endsWith(`/${d.b_id[0]}`))!));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("SUCCESS");
    expect(result.records).toHaveLength(21);
    expect(result.records.map((r) => r.tenderId)).toContain("GEM/2026/B/7885268");
    expect(search).toHaveBeenCalledTimes(5);
    expect(result.notes.join(" ")).toContain("21 unique bids read from 3 reported pages");
  });

  it.each(["missing", "repeated"])("marks %s later pages partial while retaining readable bids", async (failure) => {
    const first = Array.from({ length: 10 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    mockSearch({ 1: response(first, 20), 2: failure === "missing" ? Error("timeout") : response(first, 20, 10) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(first.find((d) => url.endsWith(`/${d.b_id[0]}`))!));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(10);
    expect(result.notes.join(" ")).toContain("10 unique bids");
  });

  it.each([true, false])("closing-date recovery fills repeated page gaps: %s", async (complete) => {
    const bids = Array.from({ length: 21 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    const recoveryDates: string[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
    if (url.endsWith("/org-list-adv")) return "[]";
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: [] } });
      expect(url).toBe("https://bidplus.gem.gov.in/search-bids");
      const form = new URLSearchParams(init?.body as URLSearchParams);
      const payload = JSON.parse(form.get("payload")!);
      expect(payload.state_name_con).toBe("Chandigarh");
      if (payload.bidEndFromCon) {
        recoveryDates.push(payload.bidEndFromCon);
        expect(payload.bidEndToCon).toBe(payload.bidEndFromCon);
        expect(payload.page).toBe(1);
        const recovered = bids.slice(11, complete ? 21 : 20);
        return response(recovered);
      }
      if (payload.page === 1) return response(bids.slice(0, 10), 21);
      if (payload.page === 2) return response(bids.slice(0, 10), 21, 10);
      if (payload.page === 3) return response(bids.slice(10, 11), 21, 20);
      throw Error("Unexpected regional search page");
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(bids.find((d) => url.endsWith(`/${d.b_id[0]}`))!));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(recoveryDates).toEqual(["20-10-2026"]);
    expect(result.status).toBe(complete ? "SUCCESS" : "PARTIAL");
    expect(result.records).toHaveLength(complete ? 21 : 20);
    expect(new Set(result.records.map((r) => r.tenderId)).size).toBe(result.records.length);
    expect(result.notes.join(" ")).toContain("closing-date group searches");
    expect(result.records.some((r) => r.tenderId === "GEM/2026/B/7885268")).toBe(complete);
  });

  it.each(["failed", "short"])("recovers a missed priority bid after a %s broad page while keeping partial status", async (gap) => {
    const bids = Array.from({ length: 11 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    const recoveryDates: string[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
    if (url.endsWith("/org-list-adv")) return "[]";
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: [] } });
      const payload = JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get("payload")!);
      if (payload.bidEndFromCon) {
        recoveryDates.push(payload.bidEndFromCon);
        expect(payload.bidEndToCon).toBe(payload.bidEndFromCon);
        return response([bids[10]]);
      }
      if (payload.page === 1) return response(bids.slice(0, 10), 11);
      if (gap === "failed") throw Error("Transient broad-page failure");
      return response([], 11, 10);
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(bids.find((d) => url.endsWith(`/${d.b_id[0]}`))!));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(recoveryDates).toEqual(["20-10-2026"]);
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(11);
    expect(result.records.map((r) => r.tenderId)).toContain(bids[10].b_bid_number[0]);
  });

  it("skips closing-date recovery after the original listing time budget expires", async () => {
    const bids = Array.from({ length: 10 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    let clock = Date.parse("2026-10-02T12:00:00Z"), recoveryCalls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
    if (url.endsWith("/org-list-adv")) return "[]";
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: [] } });
      const payload = JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get("payload")!);
      if (payload.bidEndFromCon) recoveryCalls++;
      if (payload.page === 1) return response(bids, 11);
      clock += 90001;
      throw Error("Listing time budget exhausted");
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(bids.find((d) => url.endsWith(`/${d.b_id[0]}`))!));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(recoveryCalls).toBe(0);
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(10);
  });

  it.each([false, true])("supplements regional results with state-health bids while preserving missing-page status: %s", async (missingPage) => {
    const regional = Array.from({ length: missingPage ? 10 : 1 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    const defibrillator = doc("7987137", "9836267", "Defibrillator", "2026-10-05T13:00:00Z");
    defibrillator.ba_official_details_deptName = ["Medical Education Department Himachal Pradesh"];
    const buyerQueries: unknown[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
    if (url.endsWith("/org-list-adv")) return "[]";
      const form = new URLSearchParams(init?.body as URLSearchParams);
      expect(form.get("csrf_bd_gem_nk")).toBe("public-session");
      expect(init?.method).toBe("POST");
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: ["CHANDIGARH", "PUNJAB", "HIMACHAL PRADESH"] } });
      expect(url).toBe("https://bidplus.gem.gov.in/search-bids");
      const payload = JSON.parse(form.get("payload")!);
      if (payload.searchType === "ministry-search") {
        buyerQueries.push(payload);
        return response([defibrillator]);
      }
      expect(payload.state_name_con).toBe("Himachal Pradesh");
      if (payload.page === 2) throw Error("Missing regional page");
      return response(regional, missingPage ? 11 : 1);
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => {
      const d = [defibrillator, ...regional].find((r) => url.endsWith(`/${r.b_id[0]}`))!;
      return pdf(d, slbs, "Nerchowk");
    });
    const result = await createGemAdapter("Himachal Pradesh").fetch();
    expect(buyerQueries).toEqual([{
      searchType: "ministry-search", ministry: "", buyerState: "HIMACHAL PRADESH",
      organization: "", department: "", bidEndFromMin: "", bidEndToMin: "", page: 1,
    }]);
    expect(result.status).toBe(missingPage ? "PARTIAL" : "SUCCESS");
    expect(result.records).toHaveLength(regional.length + 1);
    const recovered = result.records.find((r) => r.tenderId === "GEM/2026/B/7987137")!;
    expect(recovered.tenderUrl).toBe("https://bidplus.gem.gov.in/showbidDocument/9836267");
    const tender = normalizeTender(recovered, false, new Date(recovered.fetchedAt));
    expect(tender?.institutionId).toBe("slbsgmch-nerchowk");
    expect(tender?.priorityCategories).toContain("DEFIBRILLATORS");
    expect(tender?.effectiveClosingDate).toBe("2026-10-05T13:00:00+05:30");
    expect(result.notes.join(" ")).toContain("State-government buyer search: 1 unique bids read of 1");
  });

  it("selects exact returned human-health buyer names without a nationwide generic campus search", () => {
    const name = "Government Medical College Amritsar ";
    expect(selectGemOrganisations([name, name.toUpperCase(), "Punjab Police", "Deputy Director Animal Health Services", "Dr Yashwant Singh Parmar University of Horticulture", "PUNJAB HEALTH SYSTEMS CORPORATION"], "Punjab", true))
      .toEqual([name, "PUNJAB HEALTH SYSTEMS CORPORATION"]);
    expect(selectGemOrganisations([pgimer, "All India Institute of Medical Sciences (AIIMS)", "Hospital Services Consultancy Corporation", "Government Medical College Amritsar", "GMCH Guwahati", "PGIMER Guwahati"], "Chandigarh", false)).toEqual([pgimer]);
    expect(() => selectGemOrganisations({ names: [pgimer] }, "Chandigarh", false)).toThrow();
  });

  it("recovers a bid on an entirely unseen closing date through its official organisation", async () => {
    const known = doc();
    const missing = doc("8005979", "9857868", "ICU beds", "2026-11-01T14:00:00Z");
    let organisationCalls = 0;
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({status:200,data:{BuyerStateList:[],MinistryList:["Ministry of Health and Family Welfare"]}});
      const form = new URLSearchParams(init?.body as URLSearchParams);
      expect(form.get("csrf_bd_gem_nk")).toBe("public-session");
      if (url.endsWith("/org-list-adv")) {
        expect(form.get("ministry")).toBe("Ministry of Health and Family Welfare");
        expect(form.has("buyer_state")).toBe(false);
        return JSON.stringify([pgimer]);
      }
      const q = JSON.parse(form.get("payload")!);
      if (q.organization) {
        organisationCalls++;
        expect(q).toEqual({searchType:"ministry-search",ministry:"Ministry of Health and Family Welfare",buyerState:"",organization:pgimer,department:"",bidEndFromMin:"",bidEndToMin:"",page:1});
        return response([known,missing]);
      }
      return response([known]);
    });
    const documents = vi.spyOn(SourceHttp.prototype,"documentText").mockImplementation(async (url) => pdf(url.endsWith('/9857868') ? missing : known));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("SUCCESS");
    expect(result.records.map((r)=>r.tenderId)).toEqual(expect.arrayContaining([known.b_bid_number[0],missing.b_bid_number[0]]));
    expect(result.records).toHaveLength(2);
    expect(documents).toHaveBeenCalledTimes(2);
    expect(organisationCalls).toBe(1);
    expect(result.notes.join(" ")).toContain("Regional GeM search: 1 unique bids");
    expect(result.notes.join(" ")).toContain("Targeted organisation recovery: 1 additional unique bids");
    const recovered = normalizeTender(result.records.find((r)=>r.tenderId===missing.b_bid_number[0])!,false,new Date("2026-10-02T10:00:00+05:30"));
    expect(recovered?.institutionId).toBe("pgimer");
    expect(recovered?.priorityCategories).toContain("HOSPITAL_BEDS");
  });

  it.each(["wrong identity","unrelated buyer"])("does not trust the organisation query when the recovered PDF has %s", async (failure) => {
    const known = doc(), missing = doc("8005979","9857868","ICU beds");
    vi.spyOn(SourceHttp.prototype,"text").mockImplementation(async (url,init)=>{
      if(url===GEM_SEARCH_PAGE)return pageHtml;
      if(url.endsWith('/ministry-list-adv'))return JSON.stringify({status:200,data:{BuyerStateList:[],MinistryList:["Ministry of Health and Family Welfare"]}});
      if(url.endsWith('/org-list-adv'))return JSON.stringify([pgimer]);
      const q=JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get('payload')!);
      return response(q.organization ? [missing] : [known]);
    });
    vi.spyOn(SourceHttp.prototype,"documentText").mockImplementation(async(url)=>url.endsWith('/9857868')
      ? failure==='wrong identity' ? pdf(doc('9999999')) : pdf(missing,'Indian Army','Military Hospital Chandigarh') : pdf(known));
    const result=await createGemAdapter('Chandigarh').fetch();
    expect(result.records).toHaveLength(1);
    expect(result.records[0].tenderId).toBe(known.b_bid_number[0]);
    if(failure==='wrong identity')expect(result.status).toBe('PARTIAL');
  });

  it("keeps regional records when optional organisation discovery fails", async()=>{
    const known=doc();
    vi.spyOn(SourceHttp.prototype,'text').mockImplementation(async(url)=>{
      if(url===GEM_SEARCH_PAGE)return pageHtml;
      if(url.endsWith('/ministry-list-adv'))return JSON.stringify({status:200,data:{BuyerStateList:[],MinistryList:["Ministry of Health and Family Welfare"]}});
      if(url.endsWith('/org-list-adv'))throw Error('Optional organisation lookup failed');
      return response([known]);
    });
    vi.spyOn(SourceHttp.prototype,'documentText').mockResolvedValue(pdf(known));
    const result=await createGemAdapter('Chandigarh').fetch();
    expect(result.status).toBe('PARTIAL');expect(result.records).toHaveLength(1);
    expect(result.notes.join(' ')).toContain('regional records remain available');
  });

  it("caps all organisation lookup/result requests together at 24 and each buyer at 8 pages",async()=>{
    const known=doc();let supplementalCalls=0;const queriedPages:number[]=[];
    vi.spyOn(SourceHttp.prototype,'text').mockImplementation(async(url,init)=>{
      if(url===GEM_SEARCH_PAGE)return pageHtml;
      if(url.endsWith('/ministry-list-adv'))return JSON.stringify({status:200,data:{BuyerStateList:['CHANDIGARH']}});
      if(url.endsWith('/org-list-adv')){supplementalCalls++;return JSON.stringify(Array.from({length:10},(_,i)=>`Health Services ${i}`));}
      const q=JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get('payload')!);
      if(q.organization){supplementalCalls++;queriedPages.push(q.page);return response([known],1000,(q.page-1)*10);}
      return response([known]);
    });
    const pdfChecks=vi.spyOn(SourceHttp.prototype,'documentText').mockResolvedValue(pdf(known));
    const result=await createGemAdapter('Chandigarh').fetch();
    expect(supplementalCalls).toBe(24);expect(Math.max(...queriedPages)).toBe(8);
    expect(result.status).toBe('PARTIAL');expect(result.records).toHaveLength(1);
    expect(pdfChecks).toHaveBeenCalledTimes(1);
    expect(result.notes.join(' ')).toContain('24/24 supplemental requests');
  });

  it("continues with the official health-ministry root when the state organisation list fails", async () => {
    const known = doc();
    const recovered = doc("8005979", "9857868", "ICU beds");
    const roots: string[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: ["CHANDIGARH"], MinistryList: ["Ministry of Health and Family Welfare"] } });
      const form = new URLSearchParams(init?.body as URLSearchParams);
      if (url.endsWith("/org-list-adv")) {
        roots.push(form.get("buyer_state") || form.get("ministry")!);
        if (form.has("buyer_state")) throw Error("State organisation list unavailable");
        return JSON.stringify([pgimer]);
      }
      const query = JSON.parse(form.get("payload")!);
      return response(query.organization ? [recovered] : [known]);
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => pdf(url.endsWith("/9857868") ? recovered : known));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(roots).toEqual(["CHANDIGARH", "Ministry of Health and Family Welfare"]);
    expect(result.status).toBe("PARTIAL");
    expect(result.records.map((record) => record.tenderId)).toEqual(expect.arrayContaining([known.b_bid_number[0], recovered.b_bid_number[0]]));
    expect(result.notes.join(" ")).toContain("3/24 supplemental requests used");
  });

  it("does not add organisation traffic after exhausting the shared 400-request search limit",async()=>{
    const nonmedical=doc('7885248','9718972','Office chairs');let searches=0,lookups=0;
    vi.spyOn(SourceHttp.prototype,'text').mockImplementation(async(url,init)=>{
      if(url===GEM_SEARCH_PAGE)return pageHtml;
      if(url.endsWith('/ministry-list-adv')||url.endsWith('/org-list-adv')){lookups++;throw Error('Budget should stop this lookup');}
      const q=JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get('payload')!);
      searches++;return response([nonmedical],4100,(q.page-1)*10);
    });
    const result=await createGemAdapter('Chandigarh').fetch();
    expect(searches).toBe(400);expect(lookups).toBe(0);expect(result.status).toBe('PARTIAL');expect(result.records).toEqual([]);
  });

  it("reports a changed search schema unavailable instead of a successful empty result", async () => {
    mockSearch({ 1: JSON.stringify({ code: 200, response: { docs: [] } }) });
    const documents = vi.spyOn(SourceHttp.prototype, "documentText");
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
    expect(result.records).toEqual([]);
    expect(documents).not.toHaveBeenCalled();
  });

  it("uses internal GeM document IDs rather than printed bid numbers for the three missing bids", () => {
    for (const d of [doc(), doc("8005979", "9857868", "Hospital beds", "2026-10-06T14:00:00Z"), doc("7987137", "9836267", "Defibrillator", "2026-10-05T13:00:00Z")]) {
      const raw = gemListingRecord(d, "Chandigarh", "gem-direct", new Date().toISOString());
      expect(raw.tenderUrl).toBe(`https://bidplus.gem.gov.in/showbidDocument/${d.b_id[0]}`);
      expect(raw.documents?.[0].url).toBe(raw.tenderUrl);
      expect(raw.extendedClosingDate).toBe(d.final_end_date_sort.replace("Z", "+05:30"));
      expect(raw.tenderUrl).not.toContain(d.b_bid_number[0].split("/").at(-1));
    }
  });

  it("interprets Z-labelled listing times as official Indian wall time", () => {
    expect(gemListingDate("2026-10-20T16:00:00.000Z")).toBe("2026-10-20T16:00:00+05:30");
    expect(gemListingDate(["2026-10-06T14:00:00Z"])).toBe("2026-10-06T14:00:00+05:30");
    expect(gemListingDate("not a date")).toBeUndefined();
    expect(gemListingDate("2026-02-30T16:00:00Z")).toBeUndefined();
  });

  it("keeps the current extended deadline and enriches priority scope despite an expired original PDF date", async () => {
    const d = doc("7987137", "9836267", "Defibrillator", "2026-10-05T13:00:00Z");
    mockSearch({ 1: response([d]) }, "Himachal Pradesh");
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, slbs, "Nerchowk", "Bid End Date/Time 23-09-2026 13:00:00"));
    const result = await createGemAdapter("Himachal Pradesh").fetch();
    expect(result.status).toBe("SUCCESS");
    expect(result.records).toHaveLength(1);
    const tender = normalizeTender(result.records[0], false, new Date("2026-10-02T10:00:00+05:30"));
    expect(tender?.effectiveClosingDate).toBe("2026-10-05T13:00:00+05:30");
    expect(tender?.status).toBe("ACTIVE_LIKELY");
    expect(tender?.priorityCategories).toContain("DEFIBRILLATORS");
    expect(tender?.institutionId).toBe("slbsgmch-nerchowk");
  });

  it("rejects mismatched document identity before accepting hospital attribution", async () => {
    const d = doc();
    const raw = gemListingRecord(d, "Chandigarh", "gem-direct", new Date().toISOString());
    expect(enrichGemBuyer(raw, pdf(doc("9999999")))).toBe(false);
    expect(raw.organisation).toBeUndefined();
    expect(raw.consignees).toBeUndefined();
    mockSearch({ 1: response([d]) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(doc("9999999")));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toEqual([]);
  });

  it("excludes military buyers whose delivery state alone matches the regional search", async () => {
    const d = doc();
    mockSearch({ 1: response([d]) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, "Indian Army", "Military Hospital Chandigarh", "Consignees / Reporting Officer and Quantity\nChandigarh\nBuyer Added Bid Specific"));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.status).toBe("SUCCESS");
    expect(result.records).toEqual([]);
  });

  it("retains explicit regional health procurement as likely when its PDF is protected", async () => {
    const d = doc();
    d.ba_official_details_deptName = ["Department of Health and Family Welfare Punjab"];
    mockSearch({ 1: response([d]) }, "Punjab");
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(undefined);
    const result = await createGemAdapter("Punjab").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(1);
    expect(result.records[0].institutionId).toBeUndefined();
    const tender = normalizeTender(result.records[0], false, new Date(result.records[0].fetchedAt));
    expect(tender?.procurementScope).toBe("statewide");
    expect(tender?.status).toBe("ACTIVE_LIKELY");
  });

  it("reads PGIMER organisation and office fields from the matching bid document", async () => {
    const d = doc();
    mockSearch({ 1: response([d]) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d));
    const result = await createGemAdapter("Chandigarh").fetch();
    expect(result.records[0].organisation).toBe(pgimer);
    expect(result.records[0].location).toBe("Chandigarh");
    expect(result.records[0].institutionId).toBe("pgimer");
  });

  it.each(regions)("retains an unlisted public healthcare facility with document-proven %s scope", async (region) => {
    const d = doc();
    mockSearch({ 1: response([d]) }, region);
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, "Government Community Health Centre New Facility", `New Facility, ${region}`));
    const result = await createGemAdapter(region).fetch();
    expect(result.records).toHaveLength(1);
    expect(result.records[0].institutionId).toBeUndefined();
    expect(result.records[0].procurementScope).toBe("statewide");
    expect(result.records[0].sourceId).toBe(gemSourceIds[region]);
    expect(result.records[0].buyer).toContain("Government Community Health Centre New Facility");
    expect(result.records[0].notes?.join(" ")).toContain("not yet individually mapped");
    const tender = normalizeTender(result.records[0], false, new Date(result.records[0].fetchedAt));
    expect(tender?.region).toBe(region);
    expect(tender?.procurementScope).toBe("statewide");
    expect(tender?.status).toBe("ACTIVE_LIKELY");
  });

  it("uses a government healthcare consignee address for a central buyer's regional procurement", async () => {
    const d = doc();
    mockSearch({ 1: response([d]) }, "Punjab");
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, "Directorate of Health Services", "Central Purchasing Office New Delhi", "Consignees / Reporting Officer and Quantity\nGovernment Hospital New Facility, Punjab\nBuyer Added Bid Specific"));
    const result = await createGemAdapter("Punjab").fetch();
    expect(result.records).toHaveLength(1);
    expect(result.records[0].location).toBe("Central Purchasing Office New Delhi");
    expect(result.records[0].procurementScope).toBe("statewide");
  });

  it.each([
    ["Private Community Health Centre", "Punjab", "Department of Health and Family Welfare Punjab"],
    ["Government Veterinary Hospital New Facility", "Punjab", "Animal Husbandry Punjab"],
    ["Government Medical College New Facility", "New Delhi", "Department of Higher Education"],
    ["Government College New Facility", "Punjab", "Department of Higher Education"],
    ["Acme Health Services Foundation", "Punjab", "Department of Higher Education"],
    ["Government Hospital New Facility", "New Chandigarh, Mohali, Punjab", "Department of Higher Education"],
  ])("does not promote an unlisted excluded or unproven buyer: %s", async (organisation, office, department) => {
    const d = doc();
    d.ba_official_details_deptName = [department];
    const region = office.startsWith("New Chandigarh") ? "Chandigarh" : "Punjab";
    mockSearch({ 1: response([d]) }, region);
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, organisation, office));
    expect((await createGemAdapter(region).fetch()).records).toEqual([]);
  });

  it("requires a matching PDF identity even when the listing names a regional health department", async () => {
    const d = doc();
    d.ba_official_details_deptName = ["Department of Health and Family Welfare Punjab"];
    mockSearch({ 1: response([d]) }, "Punjab");
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(doc("9999999"), "Government Hospital New Facility", "Punjab"));
    const result = await createGemAdapter("Punjab").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toEqual([]);
  });

  it("accepts an unlisted military healthcare office only with matching defence and region evidence", async () => {
    const d = doc();
    d.ba_official_details_deptName = ["Department of Military Affairs"];
    mockSearch({ 1: response([d]) }, "Punjab");
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, "Indian Army", "Military Hospital New Facility, Punjab"));
    const result = await createGemAdapter("Punjab").fetch();
    expect(result.records).toHaveLength(1);
    expect(result.records[0].institutionId).toBeUndefined();
    expect(result.records[0].procurementScope).toBe("statewide");
  });

  it("selects unlisted public clinics returned by the state organisation directory", () => {
    expect(selectGemOrganisations(["Community Health Centre New Facility", "Primary Health Centre Another Facility", "Private Health Services", "Veterinary Government Hospital"], "Punjab", true))
      .toEqual(["Community Health Centre New Facility", "Primary Health Centre Another Facility"]);
  });

  it("uses the official Jammu & Kashmir buyer-state value and accepts the document's ampersand spelling", async () => {
    const d = doc();
    const buyerStates: string[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
      if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: ["JAMMU & KASHMIR"] } });
      if (url.endsWith("/org-list-adv")) return "[]";
      const query = JSON.parse(new URLSearchParams(init?.body as URLSearchParams).get("payload")!);
      if (query.buyerState) buyerStates.push(query.buyerState);
      else expect(query.state_name_con).toBe("JAMMU & KASHMIR");
      return response([d]);
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, "Government Hospital New Facility", "New Facility, Jammu & Kashmir"));
    const result = await createGemAdapter("Jammu and Kashmir").fetch();
    expect(buyerStates).toEqual(["JAMMU & KASHMIR"]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].sourceId).toBe("gem-direct-jammu-kashmir");
    expect(result.records[0].procurementScope).toBe("statewide");
  });

  it("checks priority equipment documents before other medical purchases", async () => {
    const routine = doc("7885248", "9718972", "Surgical gloves");
    const priority = doc("7885249", "9718973", "ICU ventilator");
    mockSearch({ 1: response([routine, priority]) }, "Haryana");
    const order: string[] = [];
    vi.spyOn(SourceHttp.prototype, "documentText").mockImplementation(async (url) => {
      order.push(url);
      return pdf(url.endsWith("9718973") ? priority : routine, "Government Hospital New Facility", "New Facility Haryana");
    });
    const result = await createGemAdapter("Haryana").fetch();
    expect(order[0]).toContain("9718973");
    expect(result.records.map((r) => r.tenderId)).toContain(priority.b_bid_number[0]);
  });

  it("keeps bulky consignee evidence for hospital matching without rendering it as the location", () => {
    const d = doc();
    const raw = gemListingRecord(d, "Chandigarh", "gem-direct", new Date().toISOString());
    const text = pdf(d, "Ministry of Health", "Regional Office", `Consignees / Reporting Officer and Quantity\n${pgimer}\n${"corrupted PDF terms ".repeat(1000)}\u0001\nBuyer Added Bid Specific`);
    expect(enrichGemBuyer(raw, text)).toBe(true);
    expect(raw.institutionId).toBe("pgimer");
    expect(raw.location).toBe("Regional Office");
    expect(raw.location).not.toContain("corrupted");
  });

  it("uses declared priority items without treating GeMARPTS search suggestions as purchased equipment", async () => {
    const d = doc("8005979", "9857868", "Hospital beds", "2026-10-06T14:00:00Z");
    mockSearch({ 1: response([d]) });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(pdf(d, pgimer, "Chandigarh", "Searched strings: ICU ventilator, ultrasound machine, defibrillator, endoscopy system"));
    const result = await createGemAdapter("Chandigarh").fetch();
    const tender = normalizeTender(result.records[0], false, new Date(result.records[0].fetchedAt));
    expect(tender?.priorityCategories).toEqual(["HOSPITAL_BEDS"]);
    expect(tender?.documentProductScope).not.toContain("Searched strings");
  });
});
