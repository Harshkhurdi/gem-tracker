import { describe, expect, it } from "vitest";
import { priorityAudit } from "../src/lib/tender/priority-audit";
import { PRIORITY_EQUIPMENT } from "../src/lib/config/priority-equipment";
import { buildDashboard } from "../src/lib/tender/normalize";
import type { RawTender, SourceFetchResult } from "../src/types/tender";
const now = new Date("2026-10-02T08:00:00Z");
function raw(title: string, extra: Partial<RawTender> = {}): RawTender {
  return { title, institutionId: "pgimer", region: "Chandigarh", sourceId: "one", sourceName: "Official", sourceUrl: "https://eprocure.gov.in", fetchedAt: now.toISOString(), originalClosingDate: "2026-10-10T10:00:00Z", verification: "detail", ...extra };
}
function source(id: string, records: RawTender[], status: SourceFetchResult["status"] = "SUCCESS"): SourceFetchResult {
  return { sourceId: id, sourceName: id, status, records, attemptedAt: now.toISOString(), notes: [], durationMs: 1, metrics: { rawRecords: records.length, institutionMatches: 0, medicalMatches: 0, falsePositivesRejected: 0, unassignedRejected: 0, detailChecks: 0 } };
}
function audit(sources: SourceFetchResult[]) { return priorityAudit(buildDashboard(sources, false, now), sources); }
describe("honest per-category priority audit", () => {
  it("reports every configured group and separates listing coverage from actual candidate hits", () => {
    const report = audit([source("one", [raw("ICU Ventilator")]), source("blocked", [], "UNAVAILABLE")]);
    expect(report.categories.map((c) => c.id)).toEqual(PRIORITY_EQUIPMENT.map((c) => c.id));
    const ventilators = report.categories.find((c) => c.id === "VENTILATORS")!;
    expect(ventilators).toMatchObject({ listingSourcesAttempted: 2, listingSourcesUnavailable: 1, candidateSourceIds: ["one"], equipmentKeywordQueryCoverage: "not-instrumented", activeVerified: 1 });
    expect(report.categories.find((c) => c.id === "HOSPITAL_BEDS")?.candidateSourceIds).toEqual([]);
    expect(report.coverage.find((s) => s.id === "blocked")?.status).toBe("UNAVAILABLE");
  });
  it("does not call deduplication, incidental descriptions or unconfirmed medical hints false positives", () => {
    const record = raw("ICU Ventilator", { tenderId: "GEM/2026/B/123" });
    const report = audit([source("one", [record, raw("Flooring in ventilator room", { tenderCategory: "Civil Works" }), raw("Fetal Doppler"), raw("ECG machine", { description: "Existing ultrasound machine in buyer inventory" })]), source("two", [{ ...record, sourceId: "two" }])]);
    expect(report.categories.find((c) => c.id === "VENTILATORS")).toMatchObject({ rawCandidates: 3, falsePositivesRejected: 1, activeVerified: 1 });
    expect(report.categories.find((c) => c.id === "ULTRASOUND")).toMatchObject({ falsePositivesRejected: 0, unconfirmedCategoryCandidates: 1, activeVerified: 0 });
  });
  it("reports all unknown deadlines separately from current unknowns using the snapshot clock", () => {
    const report = audit([source("one", [raw("ICU Ventilator", { originalClosingDate: undefined, publishDate: "2026-09-25" }), raw("ICU Ventilator historical", { originalClosingDate: undefined, publishDate: "2024-01-01" })])]);
    expect(report.categories.find((c) => c.id === "VENTILATORS")).toMatchObject({ deadlineUnknown: 2, potentiallyCurrentDeadlineUnknown: 1, notProcessed: 1 });
  });
  it("downgrades stale verified records without advancing check times", () => {
    const sources = [source("one", [raw("ICU Ventilator")])];
    const data = buildDashboard(sources, false, now);
    const report = priorityAudit(data, sources, new Date("2026-10-04T08:00:00Z").getTime());
    expect(report.categories.find((c) => c.id === "VENTILATORS")).toMatchObject({ activeVerified: 0, activeLikely: 1 });
    expect(report.opportunities[0].fetchedAt).toBe(now.toISOString());
  });
  it("deduplicates documents and separates corrigenda, BOQs, technical PDFs and reviewed scans", () => {
    const sources = [source("one", [raw("ICU Ventilator")])];
    const data = buildDashboard(sources, false, now);
    data.tenders[0].specification = {
      equipmentTypes: ["VENTILATORS"], extractionStatus: "partial", notes: [], supersededRequirements: [],
      sections: { technicalRequirements: [], accessories: [], consumables: [], serviceRequirements: [], warranty: [], cmc: [], regulatoryRequirements: [], bidderEligibility: [], delivery: [], commercialTerms: [], quantity: [] },
      documentSources: [
        { label: "Technical", url: "https://eprocure.gov.in/spec.pdf", type: "technical-specification", status: "parsed", textMethod: "pdf-text" },
        { label: "Technical duplicate", url: "https://eprocure.gov.in/spec.pdf", type: "technical-specification", status: "parsed", textMethod: "pdf-text" },
        { label: "Amendment", url: "https://eprocure.gov.in/correction.pdf", type: "corrigendum", status: "parsed", textMethod: "pdf-text" },
        { label: "BOQ", url: "https://eprocure.gov.in/boq.xlsx", type: "boq", status: "parsed", textMethod: "spreadsheet" },
        { label: "Reviewed", url: "https://eprocure.gov.in/review.pdf", type: "technical-specification", status: "parsed", textMethod: "reviewed-scan" },
        { label: "Portal", url: "https://eprocure.gov.in/FrontEndViewTender?id=1", type: "tender-document", status: "unavailable" },
      ],
    };
    expect(priorityAudit(data, sources).categories.find((c) => c.id === "VENTILATORS")).toMatchObject({ documentsFound: 4, technicalDocumentsFound: 2, technicalDocumentsParsed: 1, boqsParsed: 1, reviewedScans: 1, partial: 1 });
  });

});
