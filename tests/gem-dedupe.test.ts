import { describe, expect, it } from "vitest";
import { deduplicate } from "@/lib/tender/dedupe";
import type { Tender } from "@/types/tender";
const now = new Date("2026-10-02T12:00:00Z");
const record = (patch: Partial<Tender> = {}): Tender => ({
  id: "bid", title: "ICU beds", tenderId: "GEM/2026/B/8005979",
  region: "Chandigarh", institutionId: "pgimer", procurementScope: "institution",
  sourceId: "gem-direct", sourceName: "GeM direct", sourceUrl: "https://bidplus.gem.gov.in/advance-search",
  fetchedAt: "2026-10-02T11:59:00Z", checkedAt: "2026-10-02T11:59:00Z",
  extendedClosingDate: "2026-10-06T14:00:00+05:30", effectiveClosingDate: "2026-10-06T14:00:00+05:30",
  status: "ACTIVE_LIKELY", categories: ["HOSPITAL_BEDS"], brandMatches: [], matchedKeywords: ["beds"], confidence: 0.9,
  ...patch,
});
const mirror = (patch: Partial<Tender> = {}) => record({
  sourceId: "hospital-mirror", sourceName: "Hospital mirror", sourceUrl: "https://pgimer.edu.in/tenders",
  fetchedAt: "2026-10-02T12:00:00Z", checkedAt: "2026-10-02T12:00:00Z",
  extendedClosingDate: undefined, originalClosingDate: "2026-09-23T13:00:00+05:30",
  effectiveClosingDate: "2026-09-23T13:00:00+05:30", status: "EXPIRED", ...patch,
});
describe("direct GeM deadline authority", () => {
  for (const reverse of [false, true]) {
    it(`keeps the current direct deadline and provenance in ${reverse ? "reverse" : "forward"} input order`, () => {
      const direct = record(), hospital = mirror();
      const merged = deduplicate(reverse ? [hospital, direct] : [direct, hospital], now).tenders[0];
      expect(merged.sourceId).toBe("gem-direct");
      expect(merged.effectiveClosingDate).toBe(direct.extendedClosingDate);
      expect(merged.status).toBe("ACTIVE_LIKELY");
      expect(merged.sourceReferences).toHaveLength(2);
    });
  }
  it("preserves terminal mirror notices against the fresh direct index", () => {
    for (const status of ["CANCELLED", "WITHDRAWN"] as const) {
      const notice = mirror({status, checkedAt: "2026-10-01T10:00:00Z"});
      for (const rows of [[record(), notice], [notice, record()]])
        expect(deduplicate(rows, now).tenders[0].status).toBe(status);
    }
  });
  it("does not let stale direct evidence override a fresh mirror, even with a later timestamp", () => {
    const direct = record({stale: true}), hospital = mirror({checkedAt: "2026-10-02T11:58:00Z"});
    for (const rows of [[direct, hospital], [hospital, direct]])
      expect(deduplicate(rows, now).tenders[0].sourceId).toBe("hospital-mirror");
  });
  it("gives no special authority to an older than 24-hour direct index", () => {
    const direct = record({checkedAt: "2026-10-01T11:59:00Z"});
    expect(deduplicate([direct, mirror()], now).tenders[0].sourceId).toBe("hospital-mirror");
  });
  it("gives no special authority to a direct row without a valid current index deadline", () => {
    const direct = record({extendedClosingDate: "invalid"});
    expect(deduplicate([direct, mirror()], now).tenders[0].sourceId).toBe("hospital-mirror");
  });
  it("rejects a direct check implausibly ahead of the current time", () => {
    const direct = record({checkedAt: "2026-10-02T12:10:00Z"});
    const hospital = mirror({checkedAt: "2026-10-02T12:11:00Z"});
    expect(deduplicate([direct, hospital], now).tenders[0].sourceId).toBe("hospital-mirror");
  });
});
