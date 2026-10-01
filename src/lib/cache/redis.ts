import type { SourceFetchResult } from "@/types/tender";
function settings() {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : undefined;
}
async function command(args: (string | number)[]) {
  const config = settings();
  if (!config) return;
  try {
    const r = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!r.ok) return;
    return ((await r.json()) as { result: unknown }).result;
  } catch {
    return;
  }
}
export async function readDurable(
  id: string,
): Promise<SourceFetchResult | undefined> {
  const raw = await command(["GET", "medical-tenders:v2:" + id]);
  if (typeof raw !== "string") return;
  try {
    const value = JSON.parse(raw) as SourceFetchResult;
    return value.sourceId === id && Array.isArray(value.records)
      ? value
      : undefined;
  } catch {
    return;
  }
}
export async function writeDurable(value: SourceFetchResult) {
  await command([
    "SET",
    "medical-tenders:v2:" + value.sourceId,
    JSON.stringify(value),
    "EX",
    604800,
  ]);
}
