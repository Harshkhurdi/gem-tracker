import type { Tender } from "../../types/tender";
const norm = (s?: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
const day = (s?: string) => s?.slice(0, 10) ?? "";
function pgimerItemReference(t: Tender): string | undefined {
  return t.referenceNumber?.trim().match(/^(?:(?:E-Tender|Global Tender Enquiry)\s+Notice\s+No\.?\s*)?(PI\(EP\)\/\d{2}-\d{2}\/(?:G\/)?\d+\/\d+)$/i)?.[1].toUpperCase();
}
/** A batch's issue date and its later CPPP publication date describe the same
 * item only when its institution, complete item reference and title agree. */
function pgimerMirrorPair(a: Tender, b: Tender): boolean {
  const portal = a.sourceId === "cppp-pgimer" ? a : b.sourceId === "cppp-pgimer" ? b : undefined;
  const mirror = a.sourceId === "pgimer-notices" ? a : b.sourceId === "pgimer-notices" ? b : undefined;
  const reference = portal && pgimerItemReference(portal);
  return !!(portal && mirror && portal !== mirror &&
    portal.institutionId === "pgimer" && mirror.institutionId === "pgimer" &&
    /^20\d{2}_PGIME_\d+_\d+$/i.test(portal.tenderId || "") && !mirror.tenderId &&
    reference && reference === pgimerItemReference(mirror) && norm(portal.title) === norm(mirror.title));
}
function isSpecificDocumentOrDetail(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /\.pdf$/i.test(parsed.pathname) ||
      [...parsed.searchParams.keys()].some((k) =>
        /^(?:bidid|bid_id|tenderid|tender_id)$/i.test(k),
      ) ||
      /\/(?:tender|bid|detail)\/[^/]+$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
function sameTender(a: Tender, b: Tender): boolean {
  // Portal tender IDs are stronger than changing amendment dates or mirror metadata.
  if (a.tenderId && b.tenderId)
    return a.tenderId.trim().toLowerCase() === b.tenderId.trim().toLowerCase();
  if (a.id === b.id) return true;
  const authorityA = norm(a.institutionId || a.organisation || a.buyer),
    authorityB = norm(b.institutionId || b.organisation || b.buyer);
  if (authorityA && authorityB && authorityA !== authorityB) return false;
  if (pgimerMirrorPair(a, b)) return true;
  if (
    a.publishDate &&
    b.publishDate &&
    day(a.publishDate) !== day(b.publishDate)
  )
    return false;
  const sameTitle = norm(a.title) === norm(b.title);
  // Listing URLs represent many tenders and must never become an identity key.
  if (
    sameTitle &&
    a.tenderUrl &&
    a.tenderUrl === b.tenderUrl &&
    isSpecificDocumentOrDetail(a.tenderUrl)
  )
    return true;
  if (
    a.referenceNumber &&
    b.referenceNumber &&
    norm(a.referenceNumber) === norm(b.referenceNumber) &&
    authorityA &&
    authorityB
  ) {
    const docsA = a.documents
        ?.map((d) => d.url)
        .sort()
        .join("|"),
      docsB = b.documents
        ?.map((d) => d.url)
        .sort()
        .join("|");
    if (docsA && docsB && docsA !== docsB) return false;
    return sameTitle;
  }
  return false;
}
const observationTime = (t: Tender): number => {
  const checked = Date.parse(t.checkedAt || t.fetchedAt);
  // A malformed observation cannot outrank a known current mirror or make
  // duplicate selection depend on which source completed first.
  return Number.isFinite(checked) ? checked : -Infinity;
};
const quality = (t: Tender) =>
  (t.verification === "detail" ? 10 : 0) +
  (t.documents?.length ?? 0) +
  (t.corrigenda?.length ?? 0) +
  (t.description ? 1 : 0);
const isGemIndex = (t: Tender) =>
  (/^gem-direct(?:-|$)/.test(t.sourceId) || t.sourceId === "gem-priority-keywords") && /^GEM\/20\d{2}\/[BR]\/\d+$/i.test(t.tenderId || "");
function freshGemIndexDeadline(t: Tender, now: number): boolean {
  const checked = Date.parse(t.checkedAt || t.fetchedAt);
  return isGemIndex(t) && !t.stale &&
    Number.isFinite(Date.parse(t.extendedClosingDate || "")) &&
    Number.isFinite(checked) && now - checked <= 24 * 60 * 60 * 1000 &&
    checked - now <= 5 * 60 * 1000;
}
function freshPgimerPortal(t: Tender, now: number): boolean {
  const checked = Date.parse(t.checkedAt || t.fetchedAt);
  return t.sourceId === "cppp-pgimer" && t.verification === "detail" && !t.stale &&
    Number.isFinite(Date.parse(t.effectiveClosingDate || "")) && Number.isFinite(checked) &&
    now - checked <= 24 * 60 * 60 * 1000 && checked - now <= 5 * 60 * 1000;
}
export function deduplicate(tenders: Tender[], now = new Date()): {
  tenders: Tender[];
  duplicatesRemoved: number;
} {
  const result: Tender[] = [];
  for (const tender of tenders) {
    const index = result.findIndex((existing) => sameTender(existing, tender));
    if (index === -1) {
      result.push({ ...tender });
      continue;
    }
    const existing = result[index];
    // Preserve terminal notices even when another mirror recently repeats an active listing.
    const ta = observationTime(tender),
      tb = observationTime(existing);
    const terminal = (t: Tender) =>
      t.status === "CANCELLED" || t.status === "WITHDRAWN";
    // Fetching a hospital mirror later does not make its original PDF deadline
    // newer than the portal's current index. Cached unavailable sources cannot
    // claim this authority, and cancellation/withdrawal still take precedence.
    const incomingDirect = freshGemIndexDeadline(tender, now.getTime()),
      existingDirect = freshGemIndexDeadline(existing, now.getTime());
    const directStalenessDiffers =
      (isGemIndex(tender) || isGemIndex(existing)) &&
      !!tender.stale !== !!existing.stale;
    const pgimerPair = pgimerMirrorPair(tender, existing),
      incomingPgimer = pgimerPair && freshPgimerPortal(tender, now.getTime()),
      existingPgimer = pgimerPair && freshPgimerPortal(existing, now.getTime());
    const incomingWins =
      terminal(tender) !== terminal(existing)
        ? terminal(tender)
        : directStalenessDiffers
          ? !tender.stale
          : incomingPgimer !== existingPgimer
            ? incomingPgimer
            : incomingDirect !== existingDirect
              ? incomingDirect
              : ta > tb || (ta === tb && quality(tender) > quality(existing));
    const best = incomingWins ? tender : existing,
      other = incomingWins ? existing : tender;
    const references = [
      ...(best.sourceReferences ?? []),
      ...(other.sourceReferences ?? []),
      {
        sourceId: best.sourceId,
        sourceName: best.sourceName,
        url: best.tenderUrl || best.sourceUrl,
      },
      {
        sourceId: other.sourceId,
        sourceName: other.sourceName,
        url: other.tenderUrl || other.sourceUrl,
      },
    ];
    const documents = [...(best.documents ?? []), ...(other.documents ?? [])];
    const corrigenda = [
      ...(best.corrigenda ?? []),
      ...(other.corrigenda ?? []),
    ];
    const noticeKey = (c: NonNullable<Tender["corrigenda"]>[number]) =>
      JSON.stringify([
        c.url,
        c.title,
        c.type,
        c.publishedDate,
        c.revisedClosingDate,
      ]);
    result[index] = {
      ...best,
      description: best.description || other.description,
      equipmentItems: best.equipmentItems?.length ? best.equipmentItems : other.equipmentItems,
      specification: best.specification?.documentSources.some(
        (d) => d.status === "parsed",
      )
        ? best.specification
        : other.specification || best.specification,
      priorityCategories: [
        ...new Set([
          ...(best.priorityCategories || []),
          ...(other.priorityCategories || []),
        ]),
      ],
      tenderCategory: best.tenderCategory || other.tenderCategory,
      productCategory: best.productCategory || other.productCategory,
      procurementCategory:
        best.procurementCategory || other.procurementCategory,
      workCategory: best.workCategory || other.workCategory,
      documents: documents.length
        ? documents.filter(
            (d, i) => documents.findIndex((x) => x.url === d.url) === i,
          )
        : undefined,
      // Keep amendment evidence from every mirror, without recomputing the chosen
      // row's current deadline from potentially older historical notices.
      corrigenda: corrigenda.length
        ? corrigenda.filter(
            (c, i) =>
              corrigenda.findIndex((x) => noticeKey(x) === noticeKey(c)) === i,
          )
        : undefined,
      sourceReferences: references.filter(
        (r, i) =>
          references.findIndex(
            (x) =>
              x.url === r.url &&
              x.sourceId === r.sourceId &&
              x.sourceName === r.sourceName,
          ) === i,
      ),
    };
  }
  return { tenders: result, duplicatesRemoved: tenders.length - result.length };
}
