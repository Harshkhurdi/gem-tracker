import { adapters } from "../src/lib/sources/registry";
import { buildDashboard } from "../src/lib/tender/normalize";
import type { SourceFetchResult } from "../src/types/tender";
let next = 0;
const results: SourceFetchResult[] = [];
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (next < adapters.length) {
      const adapter = adapters[next++];
      const result = await adapter.fetch();
      results.push(result);
      console.log(
        JSON.stringify({
          source: adapter.id,
          status: result.status,
          raw: result.records.length,
          detailChecks: result.metrics.detailChecks,
          durationMs: result.durationMs,
          error: result.error,
        }),
      );
    }
  }),
);
const data = buildDashboard(results);
const active = data.tenders.filter(
  (t) => t.status === "ACTIVE_VERIFIED" || t.status === "ACTIVE_LIKELY",
);
console.log(
  JSON.stringify(
    {
      institutionsConfigured: data.institutions.length,
      sourcesAttempted: results.length,
      sourcesSuccessful: results.filter((s) => s.status === "SUCCESS").length,
      sourcesPartial: results.filter((s) => s.status === "PARTIAL").length,
      sourcesUnavailable: results.filter((s) => s.status === "UNAVAILABLE")
        .length,
      ...data.summary,
      activeInstitutions: [
        ...new Set(
          active
            .flatMap(
              (t) =>
                t.consignees?.map((c) => c.institutionId) || [t.institutionId],
            )
            .filter(Boolean),
        ),
      ],
      activeStatewide: active.filter((t) => t.procurementScope === "statewide")
        .length,
      records: active.map((t) => ({
        title: t.title,
        id: t.tenderId || t.referenceNumber,
        institutions: t.consignees,
        region: t.region,
        status: t.status,
        closes: t.effectiveClosingDate,
        source: t.tenderUrl,
      })),
    },
    null,
    2,
  ),
);
