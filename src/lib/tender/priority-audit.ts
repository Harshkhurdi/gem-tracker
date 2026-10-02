import type { DashboardData, SourceFetchResult } from "../../types/tender";
import { PRIORITY_EQUIPMENT, currentCandidate, priorityCategories } from "../config/priority-equipment";
import { productEvidence } from "./product-evidence";
import { classifyMedical } from "./classifier";
import { refreshElapsedStatuses } from "./dashboard-filter";

/** Listing coverage does not establish category keyword-query coverage. */
export function priorityAudit(data: DashboardData, sources: SourceFetchResult[], now = Date.parse(data.generatedAt)) {
  const clock = Number.isFinite(now) ? now : Date.now();
  const tenders = refreshElapsedStatuses(data.tenders, clock);
  const current = tenders.filter((t) => t.priorityCategories?.length && (t.status.startsWith("ACTIVE") || (t.status === "DEADLINE_UNKNOWN" && currentCandidate(t, clock))));
  // Classify each retained source record once rather than once per equipment
  // group; diagnostics must not repeat expensive document-text classification.
  const evidence = new Map(sources.flatMap((s) => s.records).map((record) => {
    const scope = productEvidence(record.documentProductScope || record.title);
    return [record, { scope, priorities: priorityCategories(record), medical: classifyMedical(scope, scope, record).isMedical }] as const;
  }));
  const coverage = sources.map((s) => ({ id: s.sourceId, name: s.sourceName, status: s.status, stale: !!s.stale, attemptedAt: s.attemptedAt, successfulAt: s.successfulAt, rawRecords: s.metrics.rawRecords, priority: s.priorityDiscovery, notes: s.notes, error: s.error }));
  return {
    generatedAt: data.generatedAt,
    scope: "Raw candidates are undeduplicated retained source records after adapter collection, not entire portal search totals; they include historical product alias hits. Listing coverage does not establish keyword-query coverage. False positives require rejected nonmedical product classification; unconfirmed category hints are separate. Opportunity and specification counts use deduplicated active or potentially current unknown-deadline records. All unknown deadlines are reported separately. Document counts exclude portal placeholders; reviewed scans are separate from automatic parsing.",
    categories: PRIORITY_EQUIPMENT.map((category) => {
      const candidates = sources.map((source) => ({ source, records: source.records.filter((r) => category.aliases.test(evidence.get(r)!.scope) || evidence.get(r)!.priorities.includes(category.id)) })).filter((s) => s.records.length);
      const raw = candidates.flatMap((s) => s.records);
      const rejected = raw.filter((r) => !evidence.get(r)!.medical);
      const records = current.filter((t) => t.priorityCategories!.includes(category.id));
      const unknown = tenders.filter((t) => t.status === "DEADLINE_UNKNOWN" && t.priorityCategories?.includes(category.id));
      const documents = [...new Map(records.flatMap((t) => t.specification?.documentSources || []).filter((d) => !/FrontEndViewTender|FrontEndTenderDetails/i.test(d.url) && (/\.(?:pdf|xlsx?)(?:$|\?)|\/showbidDocument\//i.test(d.url) || /\.(?:pdf|xlsx?)\b/i.test(d.label) || d.status === "parsed" || d.status === "scanned")).map((d) => [d.url, d])).values()];
      const technical = documents.filter((d) => d.type === "technical-specification" || d.type === "tender-document");
      return {
        id: category.id, category: category.label,
        listingSourcesAttempted: sources.length,
        listingSourcesSuccessful: sources.filter((s) => s.status === "SUCCESS").length,
        listingSourcesPartial: sources.filter((s) => s.status === "PARTIAL").length,
        listingSourcesUnavailable: sources.filter((s) => s.status === "UNAVAILABLE").length,
        equipmentKeywordQueryCoverage: "not-instrumented",
        candidateSourceIds: candidates.map((s) => s.source.sourceId),
        inspectedCandidateSourceIds: candidates.filter((s) => s.records.some((r) => r.specification && r.specification.extractionStatus !== "not-processed")).map((s) => s.source.sourceId),
        rawCandidates: raw.length,
        falsePositivesRejected: rejected.length,
        unconfirmedCategoryCandidates: raw.filter((r) => evidence.get(r)!.medical && !evidence.get(r)!.priorities.includes(category.id)).length,
        activeVerified: records.filter((t) => t.status === "ACTIVE_VERIFIED").length,
        activeLikely: records.filter((t) => t.status === "ACTIVE_LIKELY").length,
        deadlineUnknown: unknown.length,
        potentiallyCurrentDeadlineUnknown: records.filter((t) => t.status === "DEADLINE_UNKNOWN").length,
        documentsFound: documents.length,
        technicalDocumentsFound: technical.length,
        technicalDocumentsParsed: technical.filter((d) => d.status === "parsed" && d.textMethod !== "reviewed-scan").length,
        reviewedScans: documents.filter((d) => d.textMethod === "reviewed-scan").length,
        boqsParsed: documents.filter((d) => d.status === "parsed" && d.type === "boq").length,
        complete: records.filter((t) => t.specification?.extractionStatus === "complete").length,
        partial: records.filter((t) => t.specification?.extractionStatus === "partial").length,
        unavailable: records.filter((t) => t.specification?.extractionStatus === "document-unavailable").length,
        notProcessed: records.filter((t) => !t.specification || t.specification.extractionStatus === "not-processed").length,
      };
    }),
    opportunities: current, coverage, sources: coverage,
  };
}
