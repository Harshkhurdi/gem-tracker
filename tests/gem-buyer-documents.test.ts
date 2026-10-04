import type { SourceHttp } from "../src/lib/sources/http";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const pool = vi.hoisted(() => vi.fn((work: () => Promise<string | undefined>, lane: string) => { void lane; return work(); }));
vi.mock("../src/lib/sources/gem-request-pool", () => ({ gemRequest: pool }));
const url = (id = 1) => `https://bidplus.gem.gov.in/showbidDocument/${id}`;
let read: typeof import("../src/lib/sources/gem-buyer-documents").gemBuyerDocumentText;
let now = Date.parse("2026-10-04T10:00:00+05:30");
function client(documentText = vi.fn<SourceHttp["documentText"]>().mockResolvedValue("official buyer text")) {
  return { http: { documentText } as unknown as SourceHttp, documentText };
}
beforeEach(async () => {
  vi.resetModules(); pool.mockClear();
  now = Date.parse("2026-10-04T10:00:00+05:30");
  vi.spyOn(Date, "now").mockImplementation(() => now);
  ({ gemBuyerDocumentText: read } = await import("../src/lib/sources/gem-buyer-documents"));
});
afterEach(() => vi.restoreAllMocks());
describe("bounded official GeM buyer extraction sharing", () => {
  it("shares concurrent reads across HTTP sessions and caller lanes, then reuses success", async () => {
    let complete!: (text: string) => void;
    const first = client(vi.fn().mockImplementation(() => new Promise<string>((resolve) => { complete = resolve; })));
    const second = client();
    const a = read(first.http, url(), "normal"), b = read(second.http, url() + "#page=1", "priority");
    expect(a).toBe(b);
    expect(first.documentText).toHaveBeenCalledTimes(1);
    expect(pool.mock.calls[0][1]).toBe("normal");
    complete("matching official buyer text");
    expect(await a).toBe("matching official buyer text");
    expect(await read(second.http, url(), "priority")).toBe("matching official buyer text");
    expect(second.documentText).not.toHaveBeenCalled();
    expect(pool).toHaveBeenCalledTimes(1);
  });
  it("clears successes and prevents pre-clear work from repopulating the cache", async () => {
    const { clearGemBuyerDocumentCache } = await import("../src/lib/sources/gem-buyer-documents");
    let complete!: (text: string) => void;
    const c = client(vi.fn().mockResolvedValueOnce("cached").mockImplementationOnce(() => new Promise<string>((resolve) => { complete = resolve; })).mockResolvedValue("fresh"));
    await read(c.http, url(1), "priority");
    const pending = read(c.http, url(2), "priority");
    clearGemBuyerDocumentCache(); complete("old in-flight result"); await pending;
    expect(await read(c.http, url(1), "priority")).toBe("fresh");
    expect(await read(c.http, url(2), "priority")).toBe("fresh");
    expect(c.documentText).toHaveBeenCalledTimes(4);
  });
  it("expires after 120 seconds and cache hits never extend the TTL", async () => {
    const c = client();
    await read(c.http, url(), "priority");
    now += 119_000; await read(c.http, url(), "priority");
    expect(c.documentText).toHaveBeenCalledTimes(1);
    now += 1_000; await read(c.http, url(), "priority");
    expect(c.documentText).toHaveBeenCalledTimes(2);
  });
  it("shares an unsuccessful in-flight read but retries instead of caching failure", async () => {
    let complete!: (text: undefined) => void;
    const c = client(vi.fn().mockImplementationOnce(() => new Promise<undefined>((resolve) => { complete = resolve; })).mockResolvedValue("retried successfully"));
    const a = read(c.http, url(), "priority"), b = read(c.http, url(), "normal");
    expect(a).toBe(b); complete(undefined); expect(await a).toBeUndefined();
    expect(await read(c.http, url(), "priority")).toBe("retried successfully");
    expect(c.documentText).toHaveBeenCalledTimes(2);
  });
  it("clears rejected in-flight work so a later request can retry", async () => {
    const c = client(vi.fn().mockRejectedValueOnce(Error("unavailable")).mockResolvedValue("recovered"));
    await expect(read(c.http, url(), "priority")).rejects.toThrow("unavailable");
    expect(await read(c.http, url(), "priority")).toBe("recovered");
    expect(c.documentText).toHaveBeenCalledTimes(2);
  });
  it("does not cache empty or whitespace-only extraction", async () => {
    const c = client(vi.fn().mockResolvedValue(" "));
    await read(c.http, url(), "priority"); await read(c.http, url(), "priority");
    expect(c.documentText).toHaveBeenCalledTimes(2);
  });
  it("evicts the least recently used entry at the 128-entry limit", async () => {
    const c = client();
    for (let id = 1; id <= 128; id++) await read(c.http, url(id), "priority");
    await read(c.http, url(1), "normal");
    await read(c.http, url(129), "priority");
    await read(c.http, url(1), "normal");
    expect(c.documentText).toHaveBeenCalledTimes(129);
    await read(c.http, url(2), "normal");
    expect(c.documentText).toHaveBeenCalledTimes(130);
  });
  it("evicts for the aggregate 16MiB UTF-16 text cap", async () => {
    const c = client(vi.fn().mockResolvedValue("x".repeat(4_500_000)));
    await read(c.http, url(1), "priority"); await read(c.http, url(2), "priority");
    await read(c.http, url(2), "normal");
    expect(c.documentText).toHaveBeenCalledTimes(2);
    await read(c.http, url(1), "normal");
    expect(c.documentText).toHaveBeenCalledTimes(3);
  });
  it("returns oversized successful extraction without caching it", async () => {
    const c = client(vi.fn().mockResolvedValue("x".repeat(8_400_000)));
    expect((await read(c.http, url(), "priority"))?.length).toBe(8_400_000);
    await read(c.http, url(), "normal");
    expect(c.documentText).toHaveBeenCalledTimes(2);
  });
  it.each(["https://evil.example/showbidDocument/1", "https://eprocure.gov.in/showbidDocument/1", "http://bidplus.gem.gov.in/showbidDocument/1", "https://user:pass@bidplus.gem.gov.in/showbidDocument/1", "https://bidplus.gem.gov.in/showbidDocument/1?session=other", "https://bidplus.gem.gov.in/all-bids"])("does not read or cache unsupported URLs: %s", async (value) => {
    const c = client(); expect(await read(c.http, value, "priority")).toBeUndefined();
    expect(c.documentText).not.toHaveBeenCalled(); expect(pool).not.toHaveBeenCalled();
  });
});
