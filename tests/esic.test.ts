import { afterEach, describe, expect, it, vi } from "vitest";
import { cpppEsicAdapter } from "../src/lib/sources/adapters/esic";
import { SourceHttp } from "../src/lib/sources/http";
describe("ESIC public CPPP alternate", () => {
  afterEach(() => vi.restoreAllMocks());
  it("keeps a verified zero organisation count distinct from office-notice coverage", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      "<h1>Tenders by Organisation</h1><table><tr><td>1</td><td>Employees State Insurance Corporation</td><td>0</td></tr></table>",
    );
    const result = await cpppEsicAdapter.fetch();
    expect(result.sourceId).toBe("cppp-esic");
    expect(result.status).toBe("SUCCESS");
    expect(result.records).toEqual([]);
    expect(result.notes.join(" ")).toContain("GeM-only");
  });
  it("does not equate a challenged CPPP response with zero Ludhiana tenders", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      "Please enter CAPTCHA",
    );
    const result = await cpppEsicAdapter.fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
  });
});
