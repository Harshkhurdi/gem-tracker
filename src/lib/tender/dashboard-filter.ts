import type { Tender } from "../../types/tender";
import { BRAND_PORTFOLIOS } from "../config/brand-portfolios";
import { closingDeadlineTimestamp, istDay } from "./dates";

export const PRIORITY_BRANDS = BRAND_PORTFOLIOS.map((p) => p.brand);
export interface DashboardFilters {
  query: string;
  region: string;
  institution: string;
  scope: string;
  status: string;
  category: string;
  priorityEquipment?: string;
  brand: string;
  explicit: boolean;
  source: string;
  closing: string;
  sort: string;
  prioritize: boolean;
}
export function isActive(t: Tender) {
  return t.status === "ACTIVE_VERIFIED" || t.status === "ACTIVE_LIKELY";
}
export function refreshElapsedStatuses(
  tenders: Tender[],
  now: number,
): Tender[] {
  return tenders.map((t) => {
    if (!isActive(t)) return t;
    if (closingDeadlineTimestamp(t.effectiveClosingDate) < now)
      return { ...t, status: "EXPIRED" as const };
    const fetched = Date.parse(t.fetchedAt);
    const fresh =
      Number.isFinite(fetched) &&
      !t.stale &&
      now - fetched <= 86400000 &&
      fetched - now <= 300000 &&
      istDay(new Date(fetched)) === istDay(new Date(now));
    return t.status === "ACTIVE_VERIFIED" && !fresh
      ? { ...t, status: "ACTIVE_LIKELY" as const }
      : t;
  });
}
export function daysUntilClosing(
  value?: string,
  now = Date.now(),
): number | null {
  const deadline = closingDeadlineTimestamp(value);
  if (!Number.isFinite(deadline)) return null;
  const istDay = (timestamp: number) =>
    Math.floor((timestamp + 330 * 60000) / 86400000);
  return istDay(deadline) - istDay(now);
}
export function hasPriorityPortfolio(t: Tender) {
  return t.brandMatches.some((m) => PRIORITY_BRANDS.includes(m.brand));
}
const dateRank = (value?: string, fallback = 0) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
};
export function filterAndSortTenders(
  tenders: Tender[],
  f: DashboardFilters,
  now = Date.now(),
): Tender[] {
  const term = f.query.trim().toLowerCase();
  const priorityEnabled = tenders.some((t) => t.priorityCategories?.length);
  return tenders
    .filter((t) => {
      const days = daysUntilClosing(t.effectiveClosingDate, now);
      const searchable = [
        t.title,
        t.description,
        t.institutionName,
        ...(t.consignees?.map((c) => c.name) || []),
        t.organisation,
        t.department,
        t.buyer,
        t.location,
        t.tenderId,
        t.referenceNumber,
        ...(t.specification
          ? Object.values(t.specification.sections).flatMap((items) =>
              items.map(
                (item) => `${item.field}: ${item.value || item.requirement}`,
              ),
            )
          : []),
        t.sourceName,
        ...t.categories.map((c) => c.replaceAll("_", " ")),
        ...t.matchedKeywords,
        ...t.brandMatches.flatMap((m) => [m.brand, ...m.matchedTerms]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      // The explicit restriction belongs to the selected brand, not another match.
      const brandMatches = t.brandMatches.filter(
        (m) => !f.brand || m.brand === f.brand,
      );
      return (
        (!term ||
          term.split(/\s+/).every((word) => searchable.includes(word))) &&
        (!f.region || t.region === f.region) &&
        (!f.institution ||
          t.institutionId === f.institution ||
          t.consignees?.some((c) => c.institutionId === f.institution)) &&
        (!f.scope || t.procurementScope === f.scope) &&
        (f.status === "all" ||
          (f.status === "active" ? isActive(t) : t.status === f.status)) &&
        (!f.category || t.categories.some((c) => c === f.category)) &&
        (!f.priorityEquipment ||
          t.priorityCategories?.some((c) => c === f.priorityEquipment)) &&
        (!f.brand || brandMatches.length > 0) &&
        (!f.explicit ||
          brandMatches.some((m) => m.matchType !== "portfolio")) &&
        (!f.source ||
          t.sourceId === f.source ||
          t.sourceReferences?.some((ref) => ref.sourceId === f.source)) &&
        (!f.closing ||
          (days !== null && days >= 0 && days <= Number(f.closing)))
      );
    })
    .sort((a, b) => {
      // In priority-enabled datasets closing urgency wins over portfolio preference.
      if (f.sort === "closing" && priorityEnabled) {
        const deadline = (t: Tender) =>
          closingDeadlineTimestamp(t.effectiveClosingDate);
        const ar = deadline(a),
          br = deadline(b);
        const gap =
          (Number.isFinite(ar) ? ar : Infinity) -
          (Number.isFinite(br) ? br : Infinity);
        if (gap) return gap;
        const priority =
          Number(!!b.priorityCategories?.length) -
          Number(!!a.priorityCategories?.length);
        if (priority) return priority;
        const verified =
          Number(b.status === "ACTIVE_VERIFIED") -
          Number(a.status === "ACTIVE_VERIFIED");
        if (verified) return verified;
        const specs =
          Number(b.specification?.extractionStatus === "complete") -
          Number(a.specification?.extractionStatus === "complete");
        if (specs) return specs;
      }
      if (f.prioritize) {
        const group =
          Number(hasPriorityPortfolio(b)) - Number(hasPriorityPortfolio(a));
        if (group) return group;
      }
      if (f.sort === "newest")
        return dateRank(b.publishDate) - dateRank(a.publishDate);
      if (f.sort === "relevance") return b.confidence - a.confidence;
      const deadline = (t: Tender) => {
        const parsed = closingDeadlineTimestamp(t.effectiveClosingDate);
        return Number.isFinite(parsed) ? parsed : Infinity;
      };
      return deadline(a) - deadline(b);
    });
}
