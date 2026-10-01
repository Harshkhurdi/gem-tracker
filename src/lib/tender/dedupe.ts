import type { Tender } from "../../types/tender";
const norm = (s?: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
const day = (s?: string) => s?.slice(0, 10) ?? "";
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
const quality = (t: Tender) =>
  (t.verification === "detail" ? 10 : 0) +
  (t.documents?.length ?? 0) +
  (t.corrigenda?.length ?? 0) +
  (t.description ? 1 : 0);
export function deduplicate(tenders: Tender[]): {
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
    const ta = Date.parse(tender.checkedAt || tender.fetchedAt),
      tb = Date.parse(existing.checkedAt || existing.fetchedAt);
    const terminal = (t: Tender) =>
      t.status === "CANCELLED" || t.status === "WITHDRAWN";
    const incomingWins =
      terminal(tender) !== terminal(existing)
        ? terminal(tender)
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
