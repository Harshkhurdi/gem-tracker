import { officialUrl, type SourceHttp } from "./http";
import { gemRequest, type GemRequestLane } from "./gem-request-pool";

// Refresh-local extraction reuse only. Attribution and matching bid IDs remain
// each adapter caller's responsibility; this cache confers no verification.
const TTL_MS = 120_000;
const MAX_ENTRIES = 128;
const MAX_TEXT_BYTES = 16 * 1024 * 1024;
type CachedText = { text: string; fetchedAt: number; bytes: number };
const successful = new Map<string, CachedText>();
const inFlight = new Map<string, Promise<string | undefined>>();
let textBytes = 0;
let generation = 0;

/** Clear reusable state; already-running reads still resolve for their callers. */
export function clearGemBuyerDocumentCache(): void {
  generation++;
  successful.clear(); inFlight.clear(); textBytes = 0;
}

function remove(key: string): void {
  const cached = successful.get(key);
  if (cached) textBytes -= cached.bytes;
  successful.delete(key);
}
function expire(now: number): void {
  for (const [key, cached] of successful)
    if (now - cached.fetchedAt >= TTL_MS) remove(key);
}
function remember(key: string, text: string): void {
  // Conservatively count UTF-16 text storage, even on engines using one-byte strings.
  const bytes = text.length * 2;
  if (bytes > MAX_TEXT_BYTES) return;
  remove(key);
  while (successful.size >= MAX_ENTRIES || textBytes + bytes > MAX_TEXT_BYTES)
    remove(successful.keys().next().value!);
  successful.set(key, { text, fetchedAt: Date.now(), bytes });
  textBytes += bytes;
}

export function gemBuyerDocumentText(http: SourceHttp, url: string, lane: GemRequestLane): Promise<string | undefined> {
  const official = officialUrl(url);
  if (!official) return Promise.resolve(undefined);
  const parsed = new URL(official);
  if (parsed.hostname !== "bidplus.gem.gov.in" || parsed.search ||
      !/^\/(?:showbidDocument|showradocumentPdf|showdirectradocumentPdf)\/\d+$/.test(parsed.pathname))
    return Promise.resolve(undefined);
  parsed.hash = "";
  const key = parsed.href;
  expire(Date.now());
  const cached = successful.get(key);
  if (cached) {
    successful.delete(key);
    successful.set(key, cached); // LRU hit, without extending freshness.
    return Promise.resolve(cached.text);
  }
  const pending = inFlight.get(key);
  if (pending) return pending;
  const startedGeneration = generation;
  const work = gemRequest(() => http.documentText(key), lane)
    .then((text) => {
      if (text?.trim() && startedGeneration === generation) { expire(Date.now()); remember(key, text); }
      return text;
    })
    .finally(() => { if (inFlight.get(key) === work) inFlight.delete(key); });
  inFlight.set(key, work);
  return work;
}
