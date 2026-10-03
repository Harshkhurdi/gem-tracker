import { priorityAudit } from "./priority-audit";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { adapters } from "../src/lib/sources/registry";
import { buildDashboard } from "../src/lib/tender/normalize";
import { groupRawByInstitution } from "../src/lib/tender/institution-matcher";
import { classifyMedical } from "../src/lib/tender/classifier";
import { resolveStatus } from "../src/lib/tender/status";
import { sanitizeError } from "../src/lib/sources/http";
import type { SourceFetchResult } from "../src/types/tender";

// Development audit export only. Production cache never depends on these files.
let next = 0;
const results: SourceFetchResult[] = [];
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < adapters.length) {
      const adapter = adapters[next++];
      let result: SourceFetchResult;
      try {
        result = await adapter.fetch();
      } catch (error) {
        result = {
          sourceId: adapter.id,
          sourceName: adapter.name,
          status: "UNAVAILABLE",
          records: [],
          attemptedAt: new Date().toISOString(),
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
          durationMs: 0,
        };
      }
      results.push(result);
    }
  }),
);
const data = buildDashboard(results);
const priority = priorityAudit(data, results);
const rawByInstitution = groupRawByInstitution(results.flatMap((s) => s.records));
const audit = {
  priorityDiscovery: priority.categories,
  generatedAt: data.generatedAt,
  summary: data.summary,
  sources: data.sources.map((source) => {
    const raw =
      results.find((r) => r.sourceId === source.sourceId)?.records || [];
    const adapter = adapters.find((a) => a.id === source.sourceId)!;
    return {
      ...source,
      url: adapter.url,
      datesAvailable: raw.filter((r) => resolveStatus(r).effectiveClosingDate)
        .length,
      documentsLinked: raw.reduce((n, r) => n + (r.documents?.length || 0), 0),
      deadlineUnknownRelevant: data.tenders.filter(
        (t) =>
          t.sourceId === source.sourceId && t.status === "DEADLINE_UNKNOWN",
      ).length,
    };
  }),
  institutions: data.institutions.map((institution) => {
    const sources = data.sources.filter((s) =>
      institution.sourceIds.includes(s.sourceId),
    );
    const raw = rawByInstitution.get(institution.id) || [];
    const tenders = data.tenders.filter(
      (t) =>
        t.institutionId === institution.id ||
        t.consignees?.some((i) => i.institutionId === institution.id),
    );
    return {
      ...institution,
      sourcesChecked: sources.map((s) => ({
        id: s.sourceId,
        status: s.status,
        error: s.error,
        notes: s.notes,
      })),
      sourceRawRecords: sources.reduce((n, s) => n + s.metrics.rawRecords, 0),
      institutionMatchedRecords: raw.length,
      medicalRecords: raw.filter(
        (r) =>
          classifyMedical(
            [r.title, r.description].filter(Boolean).join("\n"),
            r.title,
            r,
          ).isMedical,
      ).length,
      activeVerified: tenders.filter((t) => t.status === "ACTIVE_VERIFIED")
        .length,
      activeLikely: tenders.filter((t) => t.status === "ACTIVE_LIKELY").length,
      deadlineUnknown: tenders.filter((t) => t.status === "DEADLINE_UNKNOWN")
        .length,
      expired: tenders.filter((t) => t.status === "EXPIRED").length,
      zeroActiveReason: tenders.some((t) => t.status.startsWith("ACTIVE"))
        ? undefined
        : sources.some((s) => s.status !== "SUCCESS")
          ? "No relevant active record found in retrieved records; coverage is incomplete because sources are partial or unavailable."
          : "No relevant active record found on successfully parsed official sources; GeM-only or unmirrored notices may still be missing.",
    };
  }),
};
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
  const directory = resolve(process.argv[outputIndex + 1]);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(directory, "priority-audit.json"),
      JSON.stringify(priority, null, 2),
    ),
    writeFile(
      resolve(directory, "source-snapshots.json"),
      JSON.stringify(results),
    ),
    writeFile(resolve(directory, "dashboard.json"), JSON.stringify(data)),
    writeFile(resolve(directory, "audit.json"), JSON.stringify(audit, null, 2)),
  ]);
}
console.log(JSON.stringify(audit, null, 2));
