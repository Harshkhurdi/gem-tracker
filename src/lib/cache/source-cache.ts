import { unstable_cache, revalidateTag } from "next/cache";
import { getAdapter, adapters } from "@/lib/sources/registry";
import { readDurable, writeDurable } from "./redis";
import type { SourceFetchResult } from "@/types/tender";
const ttl = 900;
// Data Cache persists snapshots; these bounded maps only coalesce work, retain a
// snapshot during revalidation, and stage an authorized forced-cache write.
const inflight = new Map<string, Promise<SourceFetchResult>>();
const staged = new Map<string, SourceFetchResult>();
const previousSnapshots = new Map<string, SourceFetchResult>();
const readers = new Map<string, () => Promise<SourceFetchResult>>();
function unavailable(id: string, error: string): SourceFetchResult {
  return {
    sourceId: id,
    sourceName: getAdapter(id)?.name || id,
    status: "UNAVAILABLE",
    records: [],
    attemptedAt: new Date().toISOString(),
    error,
    notes: [],
    durationMs: 0,
    metrics: {
      rawRecords: 0,
      institutionMatches: 0,
      medicalMatches: 0,
      falsePositivesRejected: 0,
      unassignedRejected: 0,
      detailChecks: 0,
    },
  };
}
function remember(result: SourceFetchResult) {
  if (result.successfulAt) previousSnapshots.set(result.sourceId, result);
}
function retain(
  failure: SourceFetchResult,
  previous?: SourceFetchResult,
): SourceFetchResult {
  return previous?.successfulAt
    ? {
        ...failure,
        records: previous.records,
        successfulAt: previous.successfulAt,
        metrics: previous.metrics,
        stale: true,
        notes: [
          ...failure.notes,
          "Source unavailable; previously checked records retained. Last verified dates have not been advanced.",
        ],
      }
    : failure;
}
async function perform(id: string): Promise<SourceFetchResult> {
  const active = inflight.get(id);
  if (active) return active;
  const adapter = getAdapter(id);
  if (!adapter) throw Error("Unknown source");
  const work = (async () => {
    let result: SourceFetchResult;
    try {
      result = await adapter.fetch();
    } catch (error) {
      result = unavailable(
        id,
        error instanceof Error ? error.message : "Source request failed",
      );
    }
    if (result.status === "UNAVAILABLE")
      result = retain(
        result,
        previousSnapshots.get(id) || (await readDurable(id)),
      );
    else remember(result);
    await writeDurable(result);
    return result;
  })().finally(() => inflight.delete(id));
  inflight.set(id, work);
  return work;
}
function reader(id: string) {
  let fn = readers.get(id);
  if (!fn) {
    fn = unstable_cache(
      async () => staged.get(id) || (await perform(id)),
      ["medical-source-v2", id],
      { revalidate: ttl, tags: ["tender-source-" + id] },
    );
    readers.set(id, fn);
  }
  return fn;
}
export async function cachedSource(id: string): Promise<SourceFetchResult> {
  try {
    const result = await reader(id)();
    remember(result);
    const stale =
      !!result.stale ||
      Date.now() - Date.parse(result.successfulAt || result.attemptedAt) >
        ttl * 1000;
    return {
      ...result,
      stale,
      status: stale && result.status === "SUCCESS" ? "PARTIAL" : result.status,
      notes: [
        ...result.notes,
        ...(stale && result.status !== "UNAVAILABLE"
          ? [
              "Previously checked records; revalidation is pending. Effective deadlines are recalculated at read time.",
            ]
          : []),
      ],
    };
  } catch (error) {
    return retain(
      unavailable(
        id,
        error instanceof Error
          ? error.message
          : "Source cache could not be read",
      ),
      previousSnapshots.get(id) || (await readDurable(id)),
    );
  }
}
export async function forceSource(id: string): Promise<SourceFetchResult> {
  const started = Date.now();
  const previous = await cachedSource(id);
  // A cold read has just performed a fresh request; do not immediately repeat it.
  if (Date.parse(previous.attemptedAt) >= started - 1000) return previous;
  remember(previous);
  const result = await perform(id);
  staged.set(id, result);
  try {
    revalidateTag("tender-source-" + id, { expire: 0 });
    await reader(id)();
  } finally {
    staged.delete(id);
  }
  return result;
}
export async function allSources(force = false) {
  const ids = adapters.map((a) => a.id);
  let next = 0;
  const results: SourceFetchResult[] = [];
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          results.push(await (force ? forceSource(id) : cachedSource(id)));
        } catch {
          results.push(unavailable(id, "Source request could not complete"));
        }
      }
    }),
  );
  return results.sort(
    (a, b) => ids.indexOf(a.sourceId) - ids.indexOf(b.sourceId),
  );
}
