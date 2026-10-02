import { describe, it, expect } from "vitest";
import { resolveStatus } from "../src/lib/tender/status";
import { deduplicate } from "../src/lib/tender/dedupe";
import type { RawTender, Tender } from "../src/types/tender";
const now = new Date("2026-09-30T12:00:00Z");
const raw = (patch: Partial<RawTender> = {}): RawTender => ({
  title: "Supply of ventilators",
  region: "Punjab",
  sourceId: "cppp",
  sourceName: "CPPP",
  sourceUrl: "https://example.gov.in",
  tenderId: "123",
  institutionId: "hospital",
  publishDate: "2026-09-01",
  originalClosingDate: "2026-10-01",
  fetchedAt: now.toISOString(),
  ...patch,
});
const tender = (patch: Partial<Tender> = {}): Tender => ({
  ...raw(),
  id: "one",
  procurementScope: "institution",
  status: "ACTIVE_LIKELY",
  categories: ["VENTILATION"],
  brandMatches: [],
  matchedKeywords: ["ventilators"],
  confidence: 0.9,
  checkedAt: now.toISOString(),
  ...patch,
});
describe("evidence based status", () => {
  it("requires fresh detail verification; no arbitrary 60 day filter", () => {
    expect(
      resolveStatus(
        raw({ verification: "listing", originalClosingDate: "2027-06-01" }),
        now,
      ).status,
    ).toBe("ACTIVE_LIKELY");
    expect(resolveStatus(raw({ verification: "detail", originalClosingDate: "2026-10-01T15:00:00+05:30" }), now).status).toBe(
      "ACTIVE_VERIFIED",
    );
    expect(
      resolveStatus(
        raw({ verification: "detail", fetchedAt: "2026-09-20" }),
        now,
      ).status,
    ).toBe("ACTIVE_LIKELY");
  });
  it("keeps day-only official detail deadlines likely instead of verifying an inferred closing time", () => {
    expect(resolveStatus(raw({ verification: "detail" }), now).status).toBe("ACTIVE_LIKELY");
    expect(resolveStatus(raw({
      verification: "detail", datePrecision: "day",
      originalClosingDate: "2026-10-01T23:59:59+05:30",
    }), now).status).toBe("ACTIVE_LIKELY");
  });
  it("preserves missing deadline as unknown", () =>
    expect(
      resolveStatus(raw({ originalClosingDate: undefined }), now).status,
    ).toBe("DEADLINE_UNKNOWN"));
  it("uses the latest valid corrigendum rather than the largest deadline", () => {
    const result = resolveStatus(
      raw({
        originalClosingDate: "2026-09-20",
        corrigenda: [
          { publishedDate: "2026-09-25", revisedClosingDate: "2026-10-20" },
          { publishedDate: "2026-09-28", revisedClosingDate: "2026-10-05" },
          { publishedDate: "2026-09-29", revisedClosingDate: "invalid" },
        ],
      }),
      now,
    );
    expect(result.effectiveClosingDate).toBe("2026-10-05");
    expect(result.status).toBe("ACTIVE_LIKELY");
  });
  it("recognizes cancellation and withdrawal notices", () => {
    expect(
      resolveStatus(
        raw({ corrigenda: [{ title: "Cancellation of tender" }] }),
        now,
      ).status,
    ).toBe("CANCELLED");
    expect(
      resolveStatus(raw({ corrigenda: [{ type: "withdrawal" }] }), now).status,
    ).toBe("WITHDRAWN");
  });
  it("expires date-only deadlines at the end of the Indian local day", () =>
    expect(
      resolveStatus(
        raw({ originalClosingDate: "2026-09-30" }),
        new Date("2026-09-30T18:31:00Z"),
      ).status,
    ).toBe("EXPIRED"));
  it("expires elapsed minute deadlines but retains a date-only deadline through that day", () => {
    expect(
      resolveStatus(raw({ originalClosingDate: "2026-09-30T11:00:00Z" }), now)
        .status,
    ).toBe("EXPIRED");
    expect(
      resolveStatus(raw({ originalClosingDate: "2026-09-30" }), now).status,
    ).toBe("ACTIVE_LIKELY");
  });
});
describe("tender deduplication", () => {
  it("merges cross source tender IDs retaining provenance and newest cancellation", () => {
    const r = deduplicate([
      tender(),
      tender({
        id: "two",
        sourceId: "gem",
        sourceName: "GeM",
        sourceUrl: "https://gem.gov.in",
        checkedAt: "2026-09-30T13:00:00Z",
        status: "CANCELLED",
      }),
    ]);
    expect(r.duplicatesRemoved).toBe(1);
    expect(r.tenders[0].status).toBe("CANCELLED");
    expect(r.tenders[0].sourceReferences).toHaveLength(2);
  });
  it("does not merge references reused on distinct publication dates", () =>
    expect(
      deduplicate([
        tender({ tenderId: undefined, referenceNumber: "REF/1" }),
        tender({
          id: "two",
          tenderId: undefined,
          referenceNumber: "REF/1",
          publishDate: "2026-09-15",
        }),
      ]).duplicatesRemoved,
    ).toBe(0));
  it("does not merge reused references with different documents", () =>
    expect(
      deduplicate([
        tender({
          tenderId: undefined,
          referenceNumber: "REF/1",
          documents: [
            { label: "Notice", url: "https://example.gov.in/one.pdf" },
          ],
        }),
        tender({
          id: "two",
          tenderId: undefined,
          referenceNumber: "REF/1",
          documents: [
            { label: "Notice", url: "https://example.gov.in/two.pdf" },
          ],
        }),
      ]).duplicatesRemoved,
    ).toBe(0));
  it("does not merge different portal IDs sharing one listing URL", () =>
    expect(
      deduplicate([
        tender({ tenderUrl: "https://example.gov.in/tenders" }),
        tender({
          id: "two",
          tenderId: "456",
          tenderUrl: "https://example.gov.in/tenders",
        }),
      ]).duplicatesRemoved,
    ).toBe(0));
  it("does not merge distinct BFUHS titles through generic listing URLs", () =>
    expect(
      deduplicate([
        tender({
          tenderId: undefined,
          tenderUrl: "https://bfuhs.ac.in/tenders",
        }),
        tender({
          id: "two",
          tenderId: undefined,
          title: "Supply of ultrasound",
          tenderUrl: "https://bfuhs.ac.in/tenders",
        }),
      ]).duplicatesRemoved,
    ).toBe(0));
  it("merges strong IDs across amendment publication dates", () =>
    expect(
      deduplicate([tender(), tender({ id: "two", publishDate: "2026-09-15" })])
        .duplicatesRemoved,
    ).toBe(1));
  it("preserves terminal cancellation against a newer active mirror", () =>
    expect(
      deduplicate([
        tender({ status: "CANCELLED" }),
        tender({ id: "two", checkedAt: "2026-10-01T12:00:00Z" }),
      ]).tenders[0].status,
    ).toBe("CANCELLED"));
});
