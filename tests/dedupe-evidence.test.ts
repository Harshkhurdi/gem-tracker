import { describe, expect, it } from "vitest";
import { deduplicate } from "../src/lib/tender/dedupe";
import type { Tender } from "../src/types/tender";

const tender = (patch: Partial<Tender> = {}): Tender => ({
  id: "123",
  tenderId: "GEM/2026/B/123",
  title: "Supply of ventilators",
  region: "Punjab",
  procurementScope: "institution",
  sourceId: "gem",
  sourceName: "GeM",
  sourceUrl: "https://gem.gov.in",
  status: "ACTIVE_LIKELY",
  categories: ["VENTILATION"],
  brandMatches: [],
  matchedKeywords: ["ventilators"],
  confidence: 0.9,
  fetchedAt: "2026-09-29T12:00:00Z",
  checkedAt: "2026-09-29T12:00:00Z",
  ...patch,
});
const notice = {
  title: "Deadline extension",
  publishedDate: "2026-09-28",
  revisedClosingDate: "2026-10-20",
  url: "https://gem.gov.in/extension.pdf",
};
const original = {
  label: "Original notice",
  url: "https://gem.gov.in/original.pdf",
};
const revision = {
  label: "Current notice",
  url: "https://gem.gov.in/revision.pdf",
};

describe("cross-source evidence preservation", () => {
  it.each([false, true])(
    "retains older evidence and the fresh row's deadline (reverse=%s)",
    (reverse) => {
      const older = tender({
        documents: [original],
        corrigenda: [notice],
        effectiveClosingDate: "2026-10-20",
      });
      const newer = tender({
        sourceId: "cppp",
        sourceName: "CPPP",
        sourceUrl: "https://eprocure.gov.in",
        documents: [revision],
        fetchedAt: "2026-09-30T12:00:00Z",
        checkedAt: "2026-09-30T12:00:00Z",
        verification: "detail",
        status: "ACTIVE_VERIFIED",
        effectiveClosingDate: "2026-10-05",
      });
      const result = deduplicate(reverse ? [newer, older] : [older, newer]);
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.tenders[0]).toMatchObject({
        sourceId: "cppp",
        effectiveClosingDate: "2026-10-05",
        status: "ACTIVE_VERIFIED",
        verification: "detail",
        corrigenda: [notice],
        documents: [revision, original],
      });
      expect(result.tenders[0].sourceReferences).toHaveLength(2);
      expect(
        result.tenders[0].sourceReferences?.map((r) => r.sourceId).sort(),
      ).toEqual(["cppp", "gem"]);
      expect(older.documents).toEqual([original]);
      expect(newer.documents).toEqual([revision]);
    },
  );

  it("removes repeated evidence but retains different amendments sharing a URL", () => {
    const updatedNotice = {
      ...notice,
      publishedDate: "2026-09-30",
      revisedClosingDate: "2026-10-05",
    };
    const result = deduplicate([
      tender({ documents: [original], corrigenda: [notice] }),
      tender({ documents: [original], corrigenda: [notice, updatedNotice] }),
    ]).tenders[0];
    expect(result.documents).toEqual([original]);
    expect(result.corrigenda).toHaveLength(2);
    expect(result.corrigenda).toEqual(
      expect.arrayContaining([notice, updatedNotice]),
    );
  });

  it("retains cancellation and evidence against a newer active mirror", () => {
    const result = deduplicate([
      tender({
        status: "CANCELLED",
        corrigenda: [{ title: "Cancellation" }],
        documents: [original],
      }),
      tender({
        checkedAt: "2026-09-30T12:00:00Z",
        documents: [revision],
        corrigenda: [notice],
      }),
    ]).tenders[0];
    expect(result.status).toBe("CANCELLED");
    expect(result.documents).toEqual([original, revision]);
    expect(result.corrigenda).toHaveLength(2);
  });

  it("never combines evidence for different strong tender IDs", () => {
    const result = deduplicate([
      tender({ documents: [original], corrigenda: [notice] }),
      tender({ tenderId: "GEM/2026/B/456", documents: [revision] }),
    ]);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.tenders[1].documents).toEqual([revision]);
    expect(result.tenders[1].corrigenda).toBeUndefined();
  });

  it("retains both source IDs when two sources point to the same document", () => {
    const url = "https://gem.gov.in/shared.pdf";
    const result = deduplicate([
      tender({ tenderUrl: url }),
      tender({
        sourceId: "mirror",
        sourceName: "Official mirror",
        tenderUrl: url,
      }),
    ]).tenders[0];
    expect(result.sourceReferences?.map((r) => r.sourceId).sort()).toEqual([
      "gem",
      "mirror",
    ]);
  });
});
