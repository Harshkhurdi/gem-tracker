import { describe, expect, it } from "vitest";
import { deduplicate } from "../src/lib/tender/dedupe";
import { normalizeTender } from "../src/lib/tender/normalize";
import { parsePgimerListing, pgimerBatchItems } from "../src/lib/sources/adapters/pgimer";
import { reviewedScans } from "../src/lib/specification/reviewed-scans";
import type { Tender } from "../src/types/tender";
const now = new Date("2026-10-03T13:10:00Z");
const scan = reviewedScans.find((d) => d.url.includes("101Oct2026155814.pdf"))!;
const batch = parsePgimerListing('<table><tr><td>1</td><td><a href="tenderViewNew.jsp?tenderId=15239">NIT for E-Tender Notice no.PI(EP)26-27-01 by Procurement Branch.</a></td><td>26-10-2026</td><td>Purchase/Procurement</td></tr></table>', now.toISOString())[0];
const mirrors = pgimerBatchItems(batch, { ...scan, label: "NIT", type: "tender-document", status: "parsed", textMethod: "reviewed-scan", productText: "" }).map((r) => normalizeTender(r, false, now)!);
function cppp(mirror: Tender, index = 0, patch: Partial<Tender> = {}): Tender {
  return {
    ...mirror, id: `portal-${index}`, tenderId: `2026_PGIME_${924588 + index}_1`,
    sourceId: "cppp-pgimer", sourceName: "CPPP / PGIMER", sourceUrl: "https://eprocure.gov.in/eprocure/app",
    tenderUrl: `https://eprocure.gov.in/eprocure/app?tenderId=${index}`,
    referenceNumber: "E-Tender Notice No. " + mirror.referenceNumber,
    publishDate: "2026-10-03T14:00:00+05:30", fetchedAt: "2026-10-03T13:03:39Z", checkedAt: "2026-10-03T13:03:39Z",
    originalClosingDate: mirror.originalClosingDate!.replace("23:59:59", "12:00:00"),
    effectiveClosingDate: mirror.effectiveClosingDate!.replace("23:59:59", "12:00:00"), datePrecision: "minute",
    verification: "detail", status: "ACTIVE_VERIFIED", specification: undefined, sourceReferences: undefined,
    documents: [{ label: "Official portal bid", url: "https://eprocure.gov.in/bid.pdf" }], ...patch,
  };
}
describe("PGIMER batch item and CPPP reconciliation", () => {
  it.each([false, true])("keeps exactly four unique items with authoritative CPPP deadlines and both source links (reverse=%s)", (reverse) => {
    const portals = mirrors.map((m, i) => cppp(m, i));
    const rows = reverse ? [...portals, ...mirrors] : [...mirrors, ...portals];
    const result = deduplicate(rows, now);
    expect(result.duplicatesRemoved).toBe(4);
    expect(result.tenders).toHaveLength(4);
    for (const item of result.tenders) {
      expect(item.sourceId).toBe("cppp-pgimer");
      expect(item.effectiveClosingDate).toContain("T12:00:00");
      expect(item.status).toBe("ACTIVE_VERIFIED");
      expect(item.specification?.extractionStatus).toBe("partial");
      expect(item.sourceReferences?.map((r) => r.sourceId).sort()).toEqual(["cppp-pgimer", "pgimer-notices"]);
    }
  });
  it("does not let a seconds-newer institutional read replace a current confirmed portal deadline", () => {
    const mirror = { ...mirrors[0], fetchedAt: "2026-10-03T13:09:59Z", checkedAt: "2026-10-03T13:09:59Z" };
    expect(deduplicate([cppp(mirror), mirror], now).tenders[0].sourceId).toBe("cppp-pgimer");
  });
  it.each([
    { referenceNumber: "E-Tender Notice No. PI(EP)/25-26/01/03" },
    { referenceNumber: "E-Tender Notice No. PI(EP)/26-27/01/09" },
    { title: "ICU Ventilators" },
    { institutionId: "aiims-bilaspur" },
    { sourceId: "other-portal" },
    { tenderId: "2026_OTHER_924588_1" },
  ])("requires exact scope, authority and item identity: %j", (patch) => {
    expect(deduplicate([mirrors[0], cppp(mirrors[0], 0, patch)], now).tenders).toHaveLength(2);
  });
  it("does not merge different endoscopy item ordinals even if their titles match", () => {
    const mirror = mirrors[1];
    expect(deduplicate([mirror, cppp(mirror, 0, { referenceNumber: "E-Tender Notice No. PI(EP)/26-27/01/09" })], now).tenders).toHaveLength(2);
  });
  it("retains terminal status when an applicable portal notice cancels the item", () => {
    expect(deduplicate([mirrors[0], cppp(mirrors[0], 0, { status: "CANCELLED" })], now).tenders[0].status).toBe("CANCELLED");
  });
  it("gives stale or older-than-24h portal detail no current deadline authority", () => {
    for (const patch of [{ stale: true }, { checkedAt: "2026-10-01T13:00:00Z" }]) {
      expect(deduplicate([cppp(mirrors[0], 0, patch), mirrors[0]], now).tenders[0].sourceId).toBe("pgimer-notices");
    }
  });
});
