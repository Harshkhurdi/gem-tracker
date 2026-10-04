import { clearGemBuyerDocumentCache } from "../src/lib/sources/gem-buyer-documents";
import { afterEach, describe, expect, it, vi } from "vitest";
import { priorityCategories } from "../src/lib/config/priority-equipment";
import { classifyMedical } from "../src/lib/tender/classifier";
import { createNicAdapter } from "../src/lib/sources/adapters/nic";
import { gemPriorityRegions } from "../src/lib/sources/adapters/gem";
import { gemPriorityAdapter, PRIORITY_KEYWORD_GROUPS } from "../src/lib/sources/adapters/gem-priority";
import { SourceHttp } from "../src/lib/sources/http";
import * as enrichment from "../src/lib/specification/enrich";
afterEach(() => { vi.restoreAllMocks(); clearGemBuyerDocumentCache(); });
describe("priority completeness safeguards", () => {
  it.each(["HIGH END MULTIPARA MONITOR", "Vital Sign Monitor", "Multipara Monitor with invasive blood monitoring system with transducers"])("accepts the official clinical monitor title %s", (title) => {
    expect(priorityCategories({ title })).toContain("PATIENT_MONITORS");
  });
  it("requires clinical or official medical evidence for a central monitor", () => {
    expect(priorityCategories({ title: "CENTRAL MONITOR", productCategory: "Medical Equipments/Waste" })).toContain("PATIENT_MONITORS");
    expect(priorityCategories({ title: "Central monitor for CCTV network" })).not.toContain("PATIENT_MONITORS");
    expect(priorityCategories({ title: "CENTRAL MONITOR" })).not.toContain("PATIENT_MONITORS");
    expect(classifyMedical("ABG ANALYSER").categories).toContain("LAB_IVD");
  });
  it("does not let a routine detail cap or PDF work starve later priority metadata", async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `2026_TEST_${1000 + i}_1`);
    const events: string[] = [];
    vi.spyOn(enrichment, "inspectPriorityTender").mockImplementation(async (r) => { events.push("doc:" + r.tenderId); });
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url) => {
      if (url.includes("FrontEndTendersByOrganisation")) return "Tenders by Organisation<table><tr><td>1</td><td>Health</td><td><a href='/eprocure/app?page=list'>25</a></td></tr></table>";
      if (url.includes("page=list")) return "S.No<table>" + ids.map((id) => `<tr><td>1</td><td>01-Oct-2026 10:00 AM</td><td>20-Oct-2027 11:00 AM</td><td>21-Oct-2027 11:00 AM</td><td><a href='/eprocure/app?sp=${id}'>[ICU ventilator]</a>[ref][${id}]</td><td>Health</td></tr>`).join("") + "</table>";
      const id = new URL(url).searchParams.get("sp")!;
      events.push("metadata:" + id);
      return `<table><tr><td>Tender ID</td><td>${id}</td></tr><tr><td>Title</td><td>ICU ventilator</td></tr></table>`;
    });
    const result = await createNicAdapter({ id: "test", name: "Health", origin: "https://eprocure.gov.in", prefix: "/eprocure/app", organisation: /^Health$/, region: "Punjab", institutionIds: [], statewide: true, detailLimit: 2 }).fetch();
    expect(result.metrics.detailChecks).toBe(25);
    expect(result.records.every((r) => r.verification === "detail")).toBe(true);
    expect(events.filter((e) => e.startsWith("metadata:")).length).toBe(25);
    expect(events.findIndex((e) => e.startsWith("doc:"))).toBeGreaterThan(events.findLastIndex((e) => e.startsWith("metadata:")));
  });
  it("does not locate a national keyword result from a generic acronym or replace outside delivery with headquarters", () => {
    expect(gemPriorityRegions("Organisation Name / GMCH\nOffice Name / Assam\nContact details")).toEqual([]);
    expect(gemPriorityRegions("Organisation Name / PGIMER Chandigarh\nOffice Name / Chandigarh\nContact details\nConsignees/Reporting Officer and Quantity\nDelhi\nTechnical Specifications")).toEqual([]);
    expect(gemPriorityRegions("Organisation Name / Government Hospital\nOffice Name / New Delhi\nContact details\nConsignees/Reporting Officer and Quantity\nJammu & Kashmir\nTechnical Specifications")).toEqual(["Jammu and Kashmir"]);
  });
  it("reads every keyword's first page before deep pagination and rejects wrong bid PDFs", async () => {
    const terms = PRIORITY_KEYWORD_GROUPS.flatMap(([, list]) => [...list]);
    const calls: { term: string; page: number }[] = [];
    const doc = { b_id: [1234567], b_bid_number: ["GEM/2026/B/1234567"], b_category_name: ["ICU ventilator"], final_end_date_sort: "2027-10-20T16:00:00Z", ba_official_details_deptName: ["Health Department Punjab"] };
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url, init) => {
      if (url.endsWith("/all-bids")) return "<script>const token={'csrf_bd_gem_nk':'session'}; const endpoint='https://bidplus.gem.gov.in/all-bids-data';</script>";
      const body = new URLSearchParams(init?.body as URLSearchParams);
      const payload = JSON.parse(body.get("payload")!);
      expect(payload.filter.bidStatusType).toBe("ongoing_bids");
      expect(payload.param.searchType).toBe("fullText");
      const term = payload.param.searchBid, page = payload.page || 1;
      calls.push({ term, page });
      const total = term === "ventilator" ? 11 : 0;
      return JSON.stringify({ code: 200, response: { response: { numFound: total, start: (page - 1) * 10, docs: total ? [doc] : [] } } });
    });
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue("Bid Details\nBid Number GEM/2026/B/9999999\nOrganisation Name / Government Medical College\nOffice Name / Punjab\nContact details\nItem Category\nICU ventilator");
    const result = await gemPriorityAdapter.fetch();
    expect(calls.slice(0, terms.length).every((c) => c.page === 1)).toBe(true);
    expect(new Set(calls.slice(0, terms.length).map((c) => c.term)).size).toBe(terms.length);
    expect(result.records).toEqual([]);
    expect(result.status).toBe("PARTIAL");
    expect(result.notes.some((n) => n.includes("Priority keyword VENTILATORS"))).toBe(true);
  });
});
