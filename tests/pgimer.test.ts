import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPgimerDetail, parsePgimerListing, pgimerAdapter, pgimerBatchItems, PGIMER_LIST } from "../src/lib/sources/adapters/pgimer";
import { SourceHttp } from "../src/lib/sources/http";
import { reviewedScans, reviewedScanPages } from "../src/lib/specification/reviewed-scans";
import { normalizeTender } from "../src/lib/tender/normalize";
import type { ParsedDocument } from "../src/types/specification";
import type { RawTender } from "../src/types/tender";

const at = "2026-10-03T06:00:00Z";
const title = "NIT for E-Tender Notice no.PI(EP)26-27-01 by Procurement Branch.";
const link = "/PGIMER_PORTAL/PGIMERPORTAL/Tender/JSP/tenderViewNew.jsp?record=8&tenderId=15239&cname=Purchase/Procurement";
const reviewed = reviewedScans.find((scan) => scan.url.includes("101Oct2026155814.pdf"))!;
const listing = (caption = title, end = "26-10-2026", href = link) => `<table><tr><td>1</td><td><a href="${href}">${caption}</a></td><td>${end}</td><td>Purchase/Procurement</td></tr></table>`;
const raw = (): RawTender => parsePgimerListing(listing(), at)[0];
const doc = (text?: string): ParsedDocument => ({
  label: "Tender Document", url: reviewed.url, type: "tender-document", status: "parsed",
  sha256: reviewed.sha256, textMethod: "reviewed-scan", productText: "",
  pages: text ? [{ page: 2, text }] : reviewed.pages.map((p) => ({ ...p })),
});
const detail = (caption = title, links = `<a href="${reviewed.url}">Tender Document</a>`, status = "Active", end = "26-10-2026") =>
  `<table><tr><td>Tender Title:</td><td>${caption}</td></tr><tr><td>Status:</td><td>${status}</td></tr><tr><td>Last Date of Submission:</td><td>${end}</td></tr></table>${links}`;

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("PGIMER institutional source identity", () => {
  it("keeps a specific official notice link, day precision and portal notice ID without inventing a bid ID", () => {
    const tender = raw();
    expect(tender).toMatchObject({ id: "pgimer-notice-15239", institutionId: "pgimer", verification: "listing", datePrecision: "day", originalClosingDate: "2026-10-26T23:59:59+05:30" });
    expect(tender.tenderUrl).toBe(new URL(link, PGIMER_LIST).href);
    expect(tender.tenderId).toBeUndefined();
  });
  it("does not treat an unreadable date or an Active badge as a deadline", () => {
    const tender = parsePgimerListing(listing("Ventilator", "31-09-2026"), at)[0];
    applyPgimerDetail(tender, detail("Ventilator", "", "Active", "Others"));
    expect(normalizeTender(tender, false, new Date(at))?.status).toBe("DEADLINE_UNKNOWN");
  });
  it("rejects changed listing structures and external detail links", () => {
    expect(() => parsePgimerListing(listing(title, "26-10-2026", "https://example.com" + link), at)).toThrow("structure changed");
    expect(() => parsePgimerListing("<table><tr><td>1</td><td>Unknown structure</td></tr></table>", at)).toThrow("structure changed");
  });
  it("checks the detail title before accepting any date or document", () => {
    expect(() => applyPgimerDetail(raw(), detail("Another ventilator tender"))).toThrow("identity differs");
  });
  it("accepts only official PDF endpoint documents and retains amendment identity", () => {
    const tender = raw();
    applyPgimerDetail(tender, detail(title, `<a href="${reviewed.url}">Tender Document</a><a href="${reviewed.url.replace("101Oct2026155814.pdf", "amended.pdf")}">Corrigendum 1</a><a href="https://example.com/bid.pdf">Bid</a><a href="/PGIMER_PORTAL/AbstractFilePath?FileType=E&FileName=bad.pdf&PathKey=OTHER_PATH">Other</a>`));
    expect(tender.documents).toHaveLength(2);
    expect(tender.corrigenda).toHaveLength(1);
    expect(tender.verification).toBe("detail");
  });
  it.each(["Cancelled", "Withdrawn"])("preserves terminal status %s on all expanded items", (status) => {
    const tender = raw();
    applyPgimerDetail(tender, detail(title, undefined, status));
    const items = pgimerBatchItems(tender, doc());
    expect(items).toHaveLength(4);
    expect(items.every((item) => normalizeTender(item, false, new Date(at))?.status === status.toUpperCase())).toBe(true);
  });
});

describe("PGIMER item-level reviewed evidence", () => {
  it("establishes exactly four priority items and their own submission dates", () => {
    const items = pgimerBatchItems(raw(), doc());
    expect(items.map((t) => [t.title, t.originalClosingDate, t.referenceNumber])).toEqual([
      ["Transport Ventilators", "2026-10-21T23:59:59+05:30", "PI(EP)/26-27/01/03"],
      ["Lower Tract Endoscopy Set", "2026-10-22T23:59:59+05:30", "PI(EP)/26-27/01/06"],
      ["Lower Tract Endoscopy Set for Emg. OT", "2026-10-26T23:59:59+05:30", "PI(EP)/26-27/01/09"],
      ["Lower Tract Endoscopy Set for TURP, TURBT, OIU, Cystoscopy", "2026-10-26T23:59:59+05:30", "PI(EP)/26-27/01/10"],
    ]);
    expect(new Set(items.map((t) => t.id)).size).toBe(4);
    expect(items.every((t) => t.datePrecision === "day" && normalizeTender(t, false, new Date(at))?.status === "ACTIVE_LIKELY")).toBe(true);
  });
  it("keeps quantities, product categories and specification evidence scoped to each row", () => {
    const [ventilator, endoscopy] = pgimerBatchItems(raw(), doc());
    expect(ventilator.specification?.equipmentTypes).toEqual(["VENTILATORS"]);
    expect(endoscopy.specification?.equipmentTypes).toEqual(["ENDOSCOPY"]);
    expect(ventilator.description).toContain("04Nos.");
    expect(endoscopy.description).toContain("01No.");
    expect(JSON.stringify(ventilator.specification?.sections)).not.toContain("Endoscopy");
    expect(JSON.stringify(endoscopy.specification?.sections)).not.toContain("Ventilators");
    expect(ventilator.specification?.extractionStatus).toBe("partial");
    expect(ventilator.specification?.documentSources[0]).toMatchObject({ url: reviewed.url, sha256: reviewed.sha256, textMethod: "reviewed-scan" });
  });
  it("does not apply the generic batch maximum or an amendment to every item", () => {
    const tender = raw();
    tender.extendedClosingDate = "2026-11-20T23:59:59+05:30";
    tender.corrigenda = [{ title: "Corrigendum 1", url: reviewed.url + "&revision=1", revisedClosingDate: "2026-11-20T23:59:59+05:30" }];
    const items = pgimerBatchItems(tender, doc());
    expect(items.every((t) => !t.originalClosingDate)).toBe(true);
    // A batch-level extension must never survive object inheritance.
    expect(items.every((t) => !t.extendedClosingDate)).toBe(true);
    expect(items.every((t) => normalizeTender(t, false, new Date(at))?.status === "DEADLINE_UNKNOWN")).toBe(true);
  });
  it("breaks ditto inheritance at an invalid submission date and ignores valid opening dates", () => {
    const text = `E-Tender Notice No. PI(EP)/26-27/01\nPostgraduate Institute of Medical Education and Research, Chandigarh\nEquipment/Item Name | Quantity | EMD | Bid submission Date | Bid Opening Date\n1 | Transport Ventilators | 04Nos. | 80000 | 31-09-2026 | 22-10-2026 | Pediatrics\n2 | Lower Tract Endoscopy Set | 01No. | 80000 | -do- | 23-10-2026 | Urology`;
    const items = pgimerBatchItems(raw(), doc(text));
    expect(items).toHaveLength(2);
    expect(items.every((t) => !t.originalClosingDate)).toBe(true);
  });
  it("breaks ditto inheritance when an intervening numbered row cannot be read", () => {
    const document = doc();
    document.pages[1].text = document.pages[1].text.replace("2 | Dental Air Rotor Lubricating Machine | 07Nos.", "2 | Dental Air Rotor Lubricating Machine | unreadable quantity");
    const [ventilator] = pgimerBatchItems(raw(), document);
    expect(ventilator.originalClosingDate).toBeUndefined();
  });
  it("does not cancel every item from a row-specific cancellation attachment", () => {
    const tender = raw();
    tender.corrigenda = [{ title: "Cancellation of item 6 only", url: reviewed.url + "&revision=2" }];
    const items = pgimerBatchItems(tender, doc());
    expect(items.every((item) => normalizeTender(item, false, new Date(at))?.status === "DEADLINE_UNKNOWN")).toBe(true);
  });
  it("withholds item expansion from unreadable scans or unrecognised table evidence", () => {
    expect(pgimerBatchItems(raw(), { ...doc(), status: "scanned", pages: [] })).toEqual([]);
    expect(pgimerBatchItems(raw(), doc("Ventilator tender 26-10-2026"))).toEqual([]);
  });
  it("rejects a readable document from a different fiscal-year or global batch", () => {
    const tender = raw();
    tender.title = "NIQ for Global Tender Enquiry Notice No. PI(EP)25-26/G/01";
    expect(pgimerBatchItems(tender, doc())).toEqual([]);
    tender.title = "NIT for E-Tender Notice No. PI(EP)/26-27/02";
    expect(pgimerBatchItems(tender, doc())).toEqual([]);
  });
  it("allows reviewed excerpts only at the exact official URL and byte hash", () => {
    expect(reviewedScanPages(reviewed.url, reviewed.sha256)).toHaveLength(2);
    expect(reviewedScanPages(reviewed.url, "different-hash")).toBeUndefined();
    expect(reviewedScanPages(reviewed.url + "&other=notice", reviewed.sha256)).toBeUndefined();
  });
  it("does not repeat an item when the same table row is repeated on another page", () => {
    const document = doc();
    document.pages.push({ ...document.pages[1], page: 3 });
    expect(pgimerBatchItems(raw(), document)).toHaveLength(4);
  });
});

describe("PGIMER live-fetch health handling", () => {
  it("retains known listing evidence and reports an unreadable generic notice as partial", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(at));
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValueOnce(listing()).mockResolvedValueOnce(detail(title, ""));
    const result = await pgimerAdapter.fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(1);
    expect(result.records[0].title).toBe(title);
  });
  it("reports an identity mismatch as incomplete and never invents priority items", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(at));
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValueOnce(listing()).mockResolvedValueOnce(detail("Different batch"));
    const result = await pgimerAdapter.fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(1);
    expect(result.notes.join(" ")).toContain("1 detail reads incomplete");
  });
});
