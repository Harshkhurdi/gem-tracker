import { afterEach, describe, expect, it, vi } from "vitest";
import { createInstitutionAdapter } from "@/lib/sources/adapters/institution";
import { SourceHttp } from "@/lib/sources/http";

describe("institution mirror amendment coverage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("inspects an attached addendum even when the original listing deadline has passed", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T00:00:00Z"));
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      `<table><tr><td>1</td><td>GEM/2026/B/7831962</td><td>DVT Pumps</td><td>27-08-2026</td><td>18-09-2026</td><td><a href="/original.pdf">Original bid</a><a href="/addendum.pdf">Addendum</a></td></tr></table>`,
    );
    const bytes = vi.spyOn(SourceHttp.prototype, "bytes").mockResolvedValue(
      new TextEncoder().encode("%PDF-test"),
    );
    vi.spyOn(SourceHttp.prototype, "documentBytesText").mockResolvedValue(
      "GEM/2026/B/7831962\nBid End Date/Time 13-10-2026 16:00:00",
    );
    const result = await createInstitutionAdapter("aiims-bathinda").fetch();
    expect(bytes).toHaveBeenCalledWith(
      "https://www.aiimsbathinda.edu.in/addendum.pdf",
      8_000_000,
    );
    // A conflicting date needs a complete amendment review before becoming actionable.
    expect(result.records[0].originalClosingDate).toBeUndefined();
    expect(result.records[0].notes?.join(" ")).toContain("pending amendment review");
    expect(result.status).toBe("PARTIAL");
  });

  it("does not report complete GeM coverage from a successful institutional mirror", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      `<table><tr><td>1</td><td>GEM/2026/B/7831962</td><td>DVT Pumps</td><td>27-08-2026</td><td>18-09-2026</td><td></td></tr></table>`,
    );
    const result = await createInstitutionAdapter("aiims-bathinda").fetch();
    expect(result.records).toHaveLength(1);
    expect(result.status).toBe("PARTIAL");
    expect(result.notes.join(" ")).toContain("remain unchecked");
  });
});
