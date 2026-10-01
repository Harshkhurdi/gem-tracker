import type { DashboardData, SourceFetchResult } from "../src/types/tender";
import {
  PRIORITY_EQUIPMENT,
  currentCandidate,
  discoveryCategories,
  priorityCategories,
} from "../src/lib/config/priority-equipment";
export function priorityAudit(
  data: DashboardData,
  sources: SourceFetchResult[],
) {
  const current = data.tenders.filter(
    (t) =>
      t.priorityCategories?.length &&
      (t.status.startsWith("ACTIVE") ||
        (t.status === "DEADLINE_UNKNOWN" && currentCandidate(t))),
  );
  return {
    generatedAt: data.generatedAt,
    scope:
      "Active and potentially current unknown deadlines. Raw candidates include historical alias hits before rejection; counts are deduplicated only at the normalized tender stage. Document counts exclude portal placeholders. Reviewed scans are reported separately from automatic parsing.",
    categories: PRIORITY_EQUIPMENT.map((category) => {
      const records = current.filter((t) =>
        t.priorityCategories!.includes(category.id),
      );
      const raw = sources
        .flatMap((s) => s.records)
        .filter(
          (t) =>
            discoveryCategories(t.title).includes(category.id) ||
            priorityCategories(t).includes(category.id),
        );
      const documents = [
        ...new Map(
          records
            .flatMap((t) => t.specification?.documentSources || [])
            .filter(
              (d) =>
                /\.(?:pdf|xlsx?)(?:$|\?)|\/showbidDocument\//i.test(d.url) ||
                /\.(?:pdf|xlsx?)\b/i.test(d.label),
            )
            .map((d) => [d.url, d]),
        ).values(),
      ];
      return {
        category: category.label,
        rawCandidates: raw.length,
        falsePositivesRejected: raw.filter(
          (t) => !priorityCategories(t).includes(category.id),
        ).length,
        activeVerified: records.filter((t) => t.status === "ACTIVE_VERIFIED")
          .length,
        activeLikely: records.filter((t) => t.status === "ACTIVE_LIKELY")
          .length,
        deadlineUnknown: records.filter((t) => t.status === "DEADLINE_UNKNOWN")
          .length,
        sourcesAttempted: sources.length,
        sourcesReadable: sources.filter((s) => s.status !== "UNAVAILABLE")
          .length,
        documentsFound: documents.length,
        technicalDocumentsParsed: documents.filter(
          (d) =>
            d.status === "parsed" &&
            d.type !== "boq" &&
            d.textMethod !== "reviewed-scan",
        ).length,
        reviewedScans: documents.filter((d) => d.textMethod === "reviewed-scan")
          .length,
        boqsParsed: documents.filter(
          (d) => d.status === "parsed" && d.type === "boq",
        ).length,
        complete: records.filter(
          (t) => t.specification?.extractionStatus === "complete",
        ).length,
        partial: records.filter(
          (t) => t.specification?.extractionStatus === "partial",
        ).length,
        unavailable: records.filter(
          (t) => t.specification?.extractionStatus === "document-unavailable",
        ).length,
        notProcessed: records.filter(
          (t) =>
            !t.specification ||
            t.specification.extractionStatus === "not-processed",
        ).length,
      };
    }),
    opportunities: current,
    sources: sources.map((s) => ({
      id: s.sourceId,
      name: s.sourceName,
      status: s.status,
      durationMs: s.durationMs,
      rawRecords: s.metrics.rawRecords,
      priority: s.priorityDiscovery,
      notes: s.notes,
      error: s.error,
    })),
  };
}
