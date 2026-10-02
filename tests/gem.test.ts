import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGemAdapter,
  enrichGemBuyer,
  GEM_SEARCH_PAGE,
  gemListingDate,
  gemListingRecord,
} from "../src/lib/sources/adapters/gem";
import { SourceHttp } from "../src/lib/sources/http";
import { normalizeTender } from "../src/lib/tender/normalize";
import type { Region } from "../src/types/tender";

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
    if (url.endsWith("/ministry-list-adv")) return JSON.stringify({ status: 200, data: { BuyerStateList: [] } });
    expect(url).toBe("https://bidplus.gem.gov.in/search-bids");
    expect(init?.method).toBe("POST");
    const form = new URLSearchParams(init?.body as URLSearchParams);
    expect(form.get("csrf_bd_gem_nk")).toBe("public-session");
    const payload = JSON.parse(form.get("payload")!);
    expect(payload.state_name_con).toBe(region);
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

  it.each([false, true])("supplements regional results with state-health bids while preserving missing-page status: %s", async (missingPage) => {
    const regional = Array.from({ length: missingPage ? 10 : 1 }, (_, i) => doc(String(7885248 + i), String(9718972 + i)));
    const defibrillator = doc("7987137", "9836267", "Defibrillator", "2026-10-05T13:00:00Z");
    defibrillator.ba_official_details_deptName = ["Medical Education Department Himachal Pradesh"];
    const buyerQueries: unknown[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url === GEM_SEARCH_PAGE) return pageHtml;
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
