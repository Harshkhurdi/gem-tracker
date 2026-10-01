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
