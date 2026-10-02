import { allSources } from "@/lib/cache/source-cache";
import { assignInstitutions } from "@/lib/tender/institution-matcher";
import { classifyMedical } from "@/lib/tender/classifier";
import { buildDashboard } from "@/lib/tender/normalize";
import { priorityAudit } from "@/lib/tender/priority-audit";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET() {
  const results = await allSources();
  const data = buildDashboard(results);
  const priority = priorityAudit(data, results);
  return Response.json(
    {
      generatedAt: data.generatedAt,
      summary: data.summary,
      sources: data.sources,
      priorityEquipment: { generatedAt: priority.generatedAt, scope: priority.scope, categories: priority.categories, coverage: priority.coverage },
      institutions: data.institutions.map((i) => {
        const sources = data.sources.filter((s) =>
          i.sourceIds.includes(s.sourceId),
        );
        const raw = results
          .flatMap((s) => s.records)
          .filter((r) => assignInstitutions(r).some((x) => x.id === i.id));
        const medicalRaw = raw.filter(
          (r) =>
            classifyMedical(
              [r.title, r.description].filter(Boolean).join("\n"),
              r.documentProductScope || r.title,
              r,
            )
              .isMedical,
        );
        const tenders = data.tenders.filter(
          (t) =>
            t.institutionId === i.id ||
            t.consignees?.some((c) => c.institutionId === i.id),
        );
        return {
          id: i.id,
          name: i.shortName,
          sourcesAttempted: sources.length,
          sourcesSuccessful: sources.filter((s) => s.status === "SUCCESS")
            .length,
          sourcesPartial: sources.filter((s) => s.status === "PARTIAL").length,
          sourcesUnavailable: sources.filter((s) => s.status === "UNAVAILABLE")
            .length,
          rawRecords: sources.reduce((n, s) => n + s.metrics.rawRecords, 0),
          institutionMatches: raw.length,
          medicalMatches: medicalRaw.length,
          falsePositivesRejected: raw.length - medicalRaw.length,
          duplicatesRemoved: Math.max(0, medicalRaw.length - tenders.length),
          activeVerified: tenders.filter((t) => t.status === "ACTIVE_VERIFIED")
            .length,
          activeLikely: tenders.filter((t) => t.status === "ACTIVE_LIKELY")
            .length,
          deadlineUnknown: tenders.filter(
            (t) => t.status === "DEADLINE_UNKNOWN",
          ).length,
          expired: tenders.filter((t) => t.status === "EXPIRED").length,
          sourceIds: i.sourceIds,
          notes:
            "Raw counts are source totals; institution counts are matched normalized records. Global duplicates removed are reported in summary.",
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
