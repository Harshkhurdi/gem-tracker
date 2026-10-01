import { istDay } from "./dates";
import { createHash } from "node:crypto";
import { assignInstitutions } from "./institution-matcher";
import { classifyMedical, matchBrands } from "./classifier";
import { resolveStatus } from "./status";
import { deduplicate } from "./dedupe";
import { institutions } from "@/lib/config/institutions";
import type {
  DashboardData,
  RawTender,
  SourceFetchResult,
  Tender,
} from "@/types/tender";
export function normalizeTender(
  raw: RawTender,
  stale = false,
  now = new Date(),
): Tender | undefined {
  const matched = assignInstitutions(raw);
  if (!matched.length && raw.procurementScope !== "statewide") return;
  const classification = classifyMedical(
    [raw.title, raw.description].filter(Boolean).join(" "),
    raw.title,
  );
  if (!classification.isMedical) return;
  const state = resolveStatus(
    {
      ...raw,
      verification:
        stale || istDay(new Date(raw.fetchedAt)) !== istDay(now)
          ? "listing"
          : raw.verification,
    },
    now,
  );
  const scope =
    matched.length > 1
      ? "multi-institution"
      : matched.length === 1
        ? "institution"
        : "statewide";
  const institution = matched.length === 1 ? matched[0] : undefined;
  const identity =
    raw.tenderId ||
    raw.id ||
    [
      raw.sourceId,
      raw.referenceNumber,
      raw.title,
      raw.publishDate,
      raw.documents?.[0]?.url,
    ].join("|");
  const id = createHash("sha256").update(identity).digest("hex").slice(0, 20);
  return {
    ...raw,
    id,
    region: institution?.region || raw.region,
    institutionId: institution?.id,
    consignees: matched.length
      ? matched.map((i) => ({ institutionId: i.id, name: i.shortName }))
      : raw.consignees,
    institutionName: institution?.shortName,
    procurementScope: scope,
    ...state,
    categories: classification.categories,
    brandMatches: matchBrands(
      [raw.title, raw.description].filter(Boolean).join(" "),
      classification.categories,
      raw.title,
    ),
    matchedKeywords: classification.matchedKeywords,
    confidence: classification.confidence,
    checkedAt: raw.fetchedAt,
    stale,
    sourceReferences: raw.sourceReferences?.length
      ? raw.sourceReferences
      : [
          {
            sourceId: raw.sourceId,
            sourceName: raw.sourceName,
            url: raw.tenderUrl || raw.sourceUrl,
          },
        ],
  };
}
export function buildDashboard(
  results: SourceFetchResult[],
  refreshEnabled = false,
  now = new Date(),
): DashboardData {
  const rawCount = results.reduce((n, s) => n + s.metrics.rawRecords, 0);
  let matchedCount = 0,
    rejected = 0,
    unassigned = 0;
  const tenders: Tender[] = [];
  const sources = results.map((source) => {
    let matched = 0,
      medical = 0,
      negatives = 0,
      noInstitution = 0;
    for (const raw of source.records) {
      const assignments = assignInstitutions(raw);
      if (!assignments.length && raw.procurementScope !== "statewide") {
        noInstitution++;
        continue;
      }
      if (assignments.length) matched++;
      if (
        !classifyMedical(
          [raw.title, raw.description].filter(Boolean).join(" "),
          raw.title,
        ).isMedical
      ) {
        negatives++;
        continue;
      }
      const tender = normalizeTender(raw, !!source.stale, now);
      if (tender) {
        medical++;
        tenders.push(tender);
      }
    }
    matchedCount += matched;
    rejected += negatives;
    unassigned += noInstitution;
    const { records: _records, ...state } = source;
    void _records;
    return {
      ...state,
      metrics: {
        ...state.metrics,
        institutionMatches: matched,
        medicalMatches: medical,
        falsePositivesRejected: negatives,
        unassignedRejected: noInstitution,
      },
    };
  });
  const unique = deduplicate(tenders);
  const list = unique.tenders;
  const count = (status: string) =>
    list.filter((t) => t.status === status).length;
  return {
    tenders: list,
    sources,
    institutions,
    lastRefreshed:
      results
        .map((s) => s.successfulAt)
        .filter((s): s is string => !!s)
        .sort()
        .at(-1) || null,
    generatedAt: now.toISOString(),
    summary: {
      rawRecords: rawCount,
      institutionMatched: matchedCount,
      medicalRelevant: tenders.length,
      activeVerified: count("ACTIVE_VERIFIED"),
      activeLikely: count("ACTIVE_LIKELY"),
      deadlineUnknown: count("DEADLINE_UNKNOWN"),
      expired: count("EXPIRED"),
      cancelled: count("CANCELLED") + count("WITHDRAWN"),
      falsePositivesRejected: rejected,
      unassignedRejected: unassigned,
      duplicatesRemoved: unique.duplicatesRemoved,
    },
    refreshEnabled,
  };
}
