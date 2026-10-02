import { describe, expect, it } from "vitest";
import { buildDashboard, normalizeTender } from "../src/lib/tender/normalize";
import type { RawTender, SourceFetchResult } from "../src/types/tender";
const now = new Date("2026-10-01T10:00:00+05:30");
function raw(title: string): RawTender {
  return {
    title,
    description:
      "Requirements for electrical works and office furniture at the hospital with ventilators.",
    region: "Punjab",
    procurementScope: "statewide",
    sourceId: "test",
    sourceName: "test",
    sourceUrl: "https://example.com",
    originalClosingDate: "2026-10-02",
    fetchedAt: now.toISOString(),
    verification: "detail",
  };
}
describe("normalization uses procurement title for conservative scope decisions", () => {
  it("keeps a record with an invalid observation timestamp likely without crashing the dashboard", () => {
    const record = {...raw("Supply of ICU ventilators"), fetchedAt: "invalid", originalClosingDate: "2026-10-02T15:00:00+05:30"};
    expect(normalizeTender(record, false, now)?.status).toBe("ACTIVE_LIKELY");
  });
  it("keeps actual ICU equipment despite body boilerplate, with aligned dashboard metrics", () => {
    const medical = raw("Supply of ICU ventilators");
    const office = raw("Supply of office furniture");
    const vague = raw("Supply of equipment");
    expect(normalizeTender(medical, false, now)?.brandMatches).toContainEqual(
      expect.objectContaining({ brand: "Hamilton Medical" }),
    );
    expect(normalizeTender(office, false, now)).toBeUndefined();
    expect(normalizeTender(vague, false, now)).toBeUndefined();
    const source: SourceFetchResult = {
      sourceId: "test",
      sourceName: "test",
      status: "SUCCESS",
      records: [medical, office, vague],
      attemptedAt: now.toISOString(),
      successfulAt: now.toISOString(),
      notes: [],
      durationMs: 1,
      metrics: {
        rawRecords: 3,
        institutionMatches: 0,
        medicalMatches: 0,
        falsePositivesRejected: 0,
        unassignedRejected: 0,
        detailChecks: 3,
      },
    };
    const dashboard = buildDashboard([source], false, now);
    expect(dashboard.tenders).toHaveLength(1);
    expect(dashboard.sources[0].metrics.medicalMatches).toBe(1);
    expect(dashboard.summary.falsePositivesRejected).toBe(2);
  });
});


it("retains generic procurements with inspected official item scope through the dashboard", () => {
  const generic = {
    ...raw("Procurement of ICU equipment"),
    tenderCategory: "Works",
    description: "Item description: ICU ventilator | Quantity: 10",
    documentProductScope: "Item description: ICU ventilator | Quantity: 10",
  };
  expect(normalizeTender(generic, false, now)?.priorityCategories).toContain("VENTILATORS");
  const source: SourceFetchResult = {
    sourceId: "test", sourceName: "test", status: "SUCCESS", records: [generic],
    attemptedAt: now.toISOString(), notes: [], durationMs: 1,
    metrics: { rawRecords: 1, institutionMatches: 0, medicalMatches: 0,
      falsePositivesRejected: 0, unassignedRejected: 0, detailChecks: 1 },
  };
  const dashboard = buildDashboard([source], false, now);
  expect(dashboard.tenders).toHaveLength(1);
  expect(dashboard.sources[0].metrics.medicalMatches).toBe(1);
  expect(dashboard.summary.falsePositivesRejected).toBe(0);
});
