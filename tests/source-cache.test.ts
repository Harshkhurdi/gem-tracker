import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceFetchResult } from "@/types/tender";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  readDurable: vi.fn(),
  writeDurable: vi.fn(),
  entries: new Map<
    string,
    { value: unknown; expires: number; tags: string[] }
  >(),
  revalidateTag: vi.fn(),
  pendingTags: new Set<string>(),
}));
vi.mock("next/cache", () => ({
  unstable_cache:
    (
      callback: () => Promise<unknown>,
      keyParts: string[],
      options: { revalidate: number; tags: string[] },
    ) =>
    async () => {
      const key = JSON.stringify(keyParts),
        entry = mocks.entries.get(key);
      if (entry && entry.expires > Date.now())
        return structuredClone(entry.value);
      const value = await callback();
      mocks.entries.set(key, {
        value: structuredClone(value),
        expires: Date.now() + options.revalidate * 1000,
        tags: options.tags,
      });
      return value;
    },
  revalidateTag: (tag: string, profile: unknown) => {
    mocks.revalidateTag(tag, profile);
    mocks.pendingTags.add(tag);
  },
}));
vi.mock("@/lib/sources/registry", () => {
  const adapter = {
    id: "test-source",
    name: "Test official source",
    fetch: mocks.fetch,
  };
  return {
    adapters: [adapter],
    getAdapter: (id: string) => (id === adapter.id ? adapter : undefined),
  };
});
vi.mock("@/lib/cache/redis", () => ({
  readDurable: mocks.readDurable,
  writeDurable: mocks.writeDurable,
}));

const result = (
  status: SourceFetchResult["status"],
  title?: string,
): SourceFetchResult => ({
  sourceId: "test-source",
  sourceName: "Test official source",
  status,
  records: title
    ? [
        {
          title,
          region: "Punjab",
          sourceId: "test-source",
          sourceName: "Test official source",
          sourceUrl: "https://example.gov.in/tenders",
          fetchedAt: new Date().toISOString(),
        },
      ]
    : [],
  attemptedAt: new Date().toISOString(),
  successfulAt: status === "UNAVAILABLE" ? undefined : new Date().toISOString(),
  error: status === "UNAVAILABLE" ? "Official source timed out" : undefined,
  notes: [],
  durationMs: 10,
  metrics: {
    rawRecords: title ? 1 : 0,
    institutionMatches: 0,
    medicalMatches: 0,
    falsePositivesRejected: 0,
    unassignedRejected: 0,
    detailChecks: 0,
  },
});

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-30T10:00:00Z"));
  mocks.entries.clear();
  mocks.pendingTags.clear();
  mocks.fetch.mockReset();
  mocks.readDurable.mockReset();
  mocks.writeDurable.mockReset();
  mocks.revalidateTag.mockReset();
  let durable: SourceFetchResult | undefined;
  mocks.readDurable.mockImplementation(
    async () => durable && structuredClone(durable),
  );
  mocks.writeDurable.mockImplementation(async (value: SourceFetchResult) => {
    durable = structuredClone(value);
  });
});
afterEach(() => vi.useRealTimers());

// Model Route Handler invalidation being applied only after its response ends.
function finishInvalidationRequest() {
  for (const [key, entry] of mocks.entries)
    if (entry.tags.some((tag) => mocks.pendingTags.has(tag)))
      mocks.entries.delete(key);
  mocks.pendingTags.clear();
}

describe("Official source cache", () => {
  it("does not publish arbitrary exception messages from adapters", async () => {
    mocks.fetch.mockRejectedValue(
      new Error("private-token-value in upstream config"),
    );
    const { cachedSource } = await import("@/lib/cache/source-cache");
    const failure = await cachedSource("test-source");
    expect(failure.status).toBe("UNAVAILABLE");
    expect(failure.error).toBe(
      "Official listing could not be retrieved or its format changed",
    );
    expect(JSON.stringify(failure)).not.toContain("private-token-value");
  });
  it("invalidates a warm snapshot and persists the subsequent GET result", async () => {
    mocks.fetch.mockResolvedValueOnce(result("SUCCESS", "Old monitor"));
    const { cachedSource, invalidateSources } =
      await import("@/lib/cache/source-cache");
    await cachedSource("test-source");
    const refreshed = result("SUCCESS", "New ventilator");
    mocks.fetch.mockResolvedValueOnce(refreshed);
    invalidateSources();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    finishInvalidationRequest();
    expect((await cachedSource("test-source")).records).toEqual(
      refreshed.records,
    );
    expect((await cachedSource("test-source")).records).toEqual(
      refreshed.records,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("does not fetch on cold invalidation and fetches the subsequent GET once", async () => {
    const refreshed = result("SUCCESS", "New ventilator");
    mocks.fetch.mockResolvedValue(refreshed);
    const { cachedSource, invalidateSources } =
      await import("@/lib/cache/source-cache");
    invalidateSources();
    expect(mocks.fetch).not.toHaveBeenCalled();
    finishInvalidationRequest();
    expect((await cachedSource("test-source")).records).toEqual(
      refreshed.records,
    );
    expect((await cachedSource("test-source")).records).toEqual(
      refreshed.records,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("replaces retained records with an empty successful listing", async () => {
    mocks.fetch.mockResolvedValueOnce(result("SUCCESS", "Old monitor"));
    const { cachedSource, invalidateSources } =
      await import("@/lib/cache/source-cache");
    await cachedSource("test-source");
    mocks.fetch.mockResolvedValueOnce(result("SUCCESS"));
    invalidateSources();
    finishInvalidationRequest();
    expect((await cachedSource("test-source")).records).toEqual([]);
    expect((await cachedSource("test-source")).records).toEqual([]);
  });
  it("caches an unavailable source across repeated reads for the source TTL", async () => {
    mocks.fetch.mockResolvedValue(result("UNAVAILABLE"));
    const { cachedSource } = await import("@/lib/cache/source-cache");
    expect((await cachedSource("test-source")).status).toBe("UNAVAILABLE");
    vi.advanceTimersByTime(61_000);
    expect((await cachedSource("test-source")).status).toBe("UNAVAILABLE");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("retains prior records and failure status when the GET after invalidation fails", async () => {
    const original = result("SUCCESS", "Patient monitor");
    mocks.fetch.mockResolvedValueOnce(original);
    const { cachedSource, invalidateSources } =
      await import("@/lib/cache/source-cache");
    await cachedSource("test-source");
    vi.advanceTimersByTime(61_000);
    mocks.fetch.mockResolvedValueOnce(result("UNAVAILABLE"));
    invalidateSources();
    finishInvalidationRequest();
    const forced = await cachedSource("test-source");
    expect(forced.status).toBe("UNAVAILABLE");
    expect(forced.stale).toBe(true);
    expect(forced.records).toEqual(original.records);
    expect(forced.successfulAt).toBe(original.successfulAt);
    expect(forced.error).toBe("Official source timed out");
    const reread = await cachedSource("test-source");
    expect(reread.status).toBe("UNAVAILABLE");
    expect(reread.stale).toBe(true);
    expect(reread.records).toEqual(original.records);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("persists a successful result after invalidation and serves it on subsequent reads", async () => {
    mocks.fetch.mockResolvedValueOnce(result("SUCCESS", "Old monitor"));
    const { cachedSource, invalidateSources } =
      await import("@/lib/cache/source-cache");
    await cachedSource("test-source");
    vi.advanceTimersByTime(61_000);
    const refreshed = result("SUCCESS", "New ventilator");
    mocks.fetch.mockResolvedValueOnce(refreshed);
    invalidateSources();
    finishInvalidationRequest();
    expect((await cachedSource("test-source")).records).toEqual(
      refreshed.records,
    );
    expect(mocks.writeDurable).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        records: refreshed.records,
      }),
    );
    const reread = await cachedSource("test-source");
    expect(reread.status).toBe("SUCCESS");
    expect(reread.records).toEqual(refreshed.records);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
