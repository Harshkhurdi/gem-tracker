import type {
  RawTender,
  SourceFetchResult,
  TenderSourceAdapter,
} from "@/types/tender";
import { sanitizeError } from "./http";
export async function runAdapter(
  adapter: Pick<TenderSourceAdapter, "id" | "name">,
  work: () => Promise<{
    records: RawTender[];
    notes?: string[];
    partial?: boolean;
  }>,
): Promise<SourceFetchResult> {
  const started = Date.now(),
    attemptedAt = new Date().toISOString();
  try {
    const result = await work();
    console.info(
      JSON.stringify({
        source: adapter.id,
        status: result.partial ? "PARTIAL" : "SUCCESS",
        records: result.records.length,
        durationMs: Date.now() - started,
      }),
    );
    return {
      sourceId: adapter.id,
      sourceName: adapter.name,
      status: result.partial ? "PARTIAL" : "SUCCESS",
      records: result.records,
      attemptedAt,
      successfulAt: new Date().toISOString(),
      notes: result.notes || [],
      metrics: {
        rawRecords: result.records.length,
        institutionMatches: 0,
        medicalMatches: 0,
        falsePositivesRejected: 0,
        unassignedRejected: 0,
        detailChecks: result.records.filter((r) => r.verification === "detail")
          .length,
      },
      durationMs: Date.now() - started,
    };
  } catch (error) {
    console.warn(
      JSON.stringify({
        source: adapter.id,
        error: sanitizeError(error),
        duration: Date.now() - started,
      }),
    );
    return {
      sourceId: adapter.id,
      sourceName: adapter.name,
      status: "UNAVAILABLE",
      records: [],
      attemptedAt,
      error: sanitizeError(error),
      notes: [],
      metrics: {
        rawRecords: 0,
        institutionMatches: 0,
        medicalMatches: 0,
        falsePositivesRejected: 0,
        unassignedRejected: 0,
        detailChecks: 0,
      },
      durationMs: Date.now() - started,
    };
  }
}
