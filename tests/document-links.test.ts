import { describe, expect, it } from "vitest";
import type { Tender } from "../src/types/tender";
import { GEM_BID_SEARCH, gemBidNumber, isGemTender, matchesDocumentView, needsManualPortal, officialLink, tenderDocumentLinks } from "../src/lib/tender/document-links";
import { filterAndSortTenders } from "../src/lib/tender/dashboard-filter";
const base: Tender = {
  id: "bid", title: "Ultrasound equipment", region: "Punjab", sourceId: "hospital",
  sourceName: "Official hospital", sourceUrl: "https://www.aiimsbathinda.edu.in/Procurements.aspx",
  fetchedAt: "2026-10-02T10:00:00+05:30", checkedAt: "2026-10-02T10:00:00+05:30",
  status: "ACTIVE_LIKELY", procurementScope: "institution", categories: ["ULTRASOUND"],
  brandMatches: [], matchedKeywords: [], confidence: 90,
};
const portal = "https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=real-published-token";
describe("separate official document links view", () => {
  it("includes GeM records without PDF retrieval or specification extraction", () => {
    const t = { ...base, tenderId: "GEM/2026/B/8999999" };
    expect(gemBidNumber(t)).toBe("GEM/2026/B/8999999");
    expect(matchesDocumentView(t, "gem")).toBe(true);
    expect(tenderDocumentLinks(t)).toEqual([{ label: "Official notice", url: base.sourceUrl }]);
    expect(GEM_BID_SEARCH).toBe("https://bidplus.gem.gov.in/all-bids");
    expect(tenderDocumentLinks(t).some((d) => /showbidDocument\/8047970/.test(d.url))).toBe(false);
  });
  it("uses the reviewed GeM internal document link for the matching printed bid", () => {
    expect(tenderDocumentLinks({ ...base, tenderId: "GEM/2026/B/8047970" })[0]).toEqual({ label: "Open GeM bid", url: "https://bidplus.gem.gov.in/showbidDocument/9906064" });
  });
  it("recognizes hyphenated GeM numbers and official GeM links", () => {
    expect(gemBidNumber({ ...base, title: "Bid GEM-2026-B-7421096" })).toBe("GEM/2026/B/7421096");
    expect(isGemTender({ ...base, tenderUrl: "https://bidplus.gem.gov.in/showbidDocument/123456" })).toBe(true);
    expect(isGemTender({ ...base, title: "Gemstone supplies" })).toBe(false);
    expect(isGemTender({ ...base, tenderUrl: "https://gem.gov.in.evil.example/bid" })).toBe(false);
  });
  it("retains protected tender pages while excluding session-dependent download actions", () => {
    const t = { ...base, tenderUrl: portal, documents: [
      { label: "Portal documents", url: portal },
      { label: "Technical PDF", url: "https://hptenders.gov.in/nicgep/app?component=docDownoad&page=FrontEndTenderDetails&session=T" },
      { label: "BOQ", url: "https://hptenders.gov.in/nicgep/app?component=%24DirectLink_9&page=FrontEndTenderDetails&sp=token" },
    ] };
    expect(needsManualPortal(t)).toBe(true);
    expect(matchesDocumentView(t, "manual")).toBe(true);
    expect(matchesDocumentView(t, "gem")).toBe(false);
    expect(tenderDocumentLinks(t)).toEqual([{ label: "Open official tender & documents", url: portal }]);
  });
  it("does not call all unavailable PDFs CAPTCHA protected", () => {
    expect(needsManualPortal({ ...base, documents: [{ label: "Official PDF", url: "https://www.aiimsbathinda.edu.in/bid.pdf" }] })).toBe(false);
  });
  it("keeps exact official GeM URLs and mirrors without constructing internal bid IDs", () => {
    const t = { ...base, tenderId: "GEM/2026/B/8047970", documents: [
      { label: "GeM document", url: "https://bidplus.gem.gov.in/showbidDocument/10001234" },
      { label: "Official mirror", url: "https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf" },
    ] };
    expect(tenderDocumentLinks(t).map((d) => d.url)).toContain("https://bidplus.gem.gov.in/showbidDocument/10001234");
    expect(tenderDocumentLinks(t).map((d) => d.url)).toContain(t.documents[1].url);
  });
  it("rejects unsafe or nonofficial links and deduplicates exact URLs", () => {
    for (const url of ["javascript:alert(1)", "http://hptenders.gov.in/x", "https://hptenders.gov.in.evil.example/x", "https://user:password@hptenders.gov.in/x", "https://mirror.example/x.pdf", "/api/documents/bfuhs/123?redirect=evil"]) expect(officialLink(url)).toBeUndefined();
    expect(officialLink("/api/documents/bfuhs/123")).toBe("/api/documents/bfuhs/123");
    const t = { ...base, documents: [{ label: "Notice", url: base.sourceUrl }] };
    expect(tenderDocumentLinks(t)).toHaveLength(1);
  });
  it("combines document view with existing filters and leaves input records unchanged", () => {
    const gem = { ...base, tenderId: "GEM/2026/B/8047970" };
    const hp = { ...base, id: "hp", region: "Himachal Pradesh" as const, tenderUrl: portal };
    const rows = [gem, hp];
    const snapshot = JSON.stringify(rows);
    const filters = { query: "8047970", region: "Punjab", institution: "", scope: "", status: "active", category: "", brand: "", explicit: false, source: "", closing: "", sort: "closing", prioritize: false };
    expect(filterAndSortTenders(rows.filter((t) => matchesDocumentView(t, "gem")), filters)).toEqual([gem]);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(rows.filter((t) => matchesDocumentView(t, "all"))).toEqual(rows);
  });
});
