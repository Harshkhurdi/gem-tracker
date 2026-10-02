import { describe, expect, it } from "vitest";
import { currentCandidate, priorityRank } from "../src/lib/config/priority-equipment";
import type { RawTender } from "../src/types/tender";

const now = Date.parse("2026-10-02T08:00:00Z");
const raw: RawTender = {
  title: "Supply of ICU ventilators",
  region: "Chandigarh",
  sourceId: "cppp-pgimer",
  sourceName: "CPPP / PGIMER",
  sourceUrl: "https://eprocure.gov.in/eprocure/app",
  fetchedAt: "2026-10-02T08:00:00Z",
  publishDate: "2026-09-01",
  originalClosingDate: "2026-09-25T17:00:00+05:30",
};
describe("priority inspection follows verified amendment metadata", () => {
  it("reconsiders an expired original when an official extension is available", () => {
    const amended = { ...raw, corrigenda: [{ type: "date extension", publishedDate: "2026-09-24", revisedClosingDate: "2026-10-10T17:00:00+05:30" }] };
    expect(currentCandidate(amended, now)).toBe(true);
    expect(priorityRank(amended, now)).toBe(3);
  });
  it.each(["Cancellation", "Withdrawal"])("does not spend active inspection budget after %s", type => {
    expect(currentCandidate({ ...raw, extendedClosingDate: "2026-10-10", corrigenda: [{ type, publishedDate: "2026-10-01" }] }, now)).toBe(false);
  });
  it("does not invent an extended deadline from an amendment title", () => {
    expect(currentCandidate({ ...raw, corrigenda: [{ title: "Date extension", publishedDate: "2026-10-01" }] }, now)).toBe(false);
  });
  it("does not promote a malformed declared deadline or far-future publication", () => {
    expect(currentCandidate({ ...raw, originalClosingDate: "bad date" }, now)).toBe(false);
    expect(currentCandidate({ ...raw, originalClosingDate: undefined, publishDate: "2030-01-01" }, now)).toBe(false);
  });
});
