import { unstable_cache, revalidateTag } from "next/cache";
import { getAdapter, adapters } from "@/lib/sources/registry";
import { readDurable, writeDurable } from "./redis";
import { sanitizeError } from "@/lib/sources/http";
import type { RawTender, SourceFetchResult } from "@/types/tender";
const ttl = 900;
// Data Cache persists snapshots; these bounded maps coalesce work and retain a
// prior snapshot during revalidation.
const inflight = new Map<string, Promise<SourceFetchResult>>();
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
/** A partial regional search cannot prove that an omitted bid disappeared. */
function retainPartialGem(
  current: SourceFetchResult,
  previous?: SourceFetchResult,
): SourceFetchResult {
  if (current.status !== "PARTIAL" || !/^gem-direct(?:-|$)/.test(current.sourceId) ||
    previous?.sourceId !== current.sourceId) return current;
  const key = (record: RawTender) => record.tenderId?.trim().toUpperCase() ||
    record.id || record.tenderUrl;
  const currentKeys = new Set(current.records.map(key).filter(Boolean));
  const retained: RawTender[] = [];
  const now = Date.now();
  for (const record of previous.records) {
    const identity = key(record), checked = Date.parse(record.fetchedAt);
    // Bound each original observation, not the newer snapshot timestamp. A
    // repeated partial fetch must not renew the life of a retained record.
    if (!identity || currentKeys.has(identity) || !Number.isFinite(checked) ||
      now - checked > 24 * 60 * 60 * 1000 || checked - now > 5 * 60 * 1000) continue;
    retained.push({
      ...record,
      stale: true,
      notes: [...new Set([...(record.notes || []),
        "Not seen in the current partial GeM fetch; prior observation retained for up to 24 hours with its original check time. Current availability requires verification.",
      ])],
    });
    currentKeys.add(identity);
  }
  if (!retained.length) return current;
  return {
    ...current,
    records: [...current.records, ...retained],
    metrics: {...current.metrics, rawRecords: current.records.length + retained.length},
    notes: [...current.notes,
      `${retained.length} prior GeM records omitted from this partial fetch are retained as stale; their original observation times have not advanced.`,
    ],
  };
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
      result = unavailable(id, sanitizeError(error));
    }
    if (result.status === "UNAVAILABLE")
      result = retain(
        result,
        previousSnapshots.get(id) || (await readDurable(id)),
      );
    else {
      if (result.status === "PARTIAL" && /^gem-direct(?:-|$)/.test(id))
        result = retainPartialGem(result,
          previousSnapshots.get(id) || (await readDurable(id)));
      remember(result);
    }
    await writeDurable(result);
    return result;
  })().finally(() => inflight.delete(id));
  inflight.set(id, work);
  return work;
}
function reader(id: string) {
  let fn = readers.get(id);
  if (!fn) {
    // Category-aware classification needs snapshots containing official NIC metadata.
    fn = unstable_cache(async () => perform(id), ["medical-source-v9", id], {
      revalidate: ttl,
      tags: ["tender-source-" + id],
    });
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
      unavailable(id, sanitizeError(error)),
      previousSnapshots.get(id) || (await readDurable(id)),
    );
  }
}
export function invalidateSources(): void {
  // Next applies Route Handler tag invalidations when that response completes.
  // Fetch fresh snapshots in a subsequent GET, after this invalidation request
  // has returned, so its deferred invalidations cannot erase the new writes.
  for (const adapter of adapters)
    revalidateTag("tender-source-" + adapter.id, { expire: 0 });
}
export async function allSources() {
  const ids = adapters.map((a) => a.id);
  let next = 0;
  const results: SourceFetchResult[] = [];
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          results.push(await cachedSource(id));
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
