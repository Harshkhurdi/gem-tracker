import type { Tender } from "../../types/tender";

export const GEM_BID_SEARCH = "https://bidplus.gem.gov.in/all-bids";
// Copied from matching bid-number links in the official GeM listing, 2 Oct 2026.
// GeM internal document IDs differ from the printed GEM/... bid number.
const reviewedGemLinks: Record<string, string> = {
  "GEM/2026/B/8047970": "https://bidplus.gem.gov.in/showbidDocument/9906064",
  "GEM/2026/B/7889626": "https://bidplus.gem.gov.in/showbidDocument/9723941",
  "GEM/2026/B/8034327": "https://bidplus.gem.gov.in/showbidDocument/9890355",
  "GEM/2026/B/7891714": "https://bidplus.gem.gov.in/showbidDocument/9726283",
  "GEM/2026/B/8028120": "https://bidplus.gem.gov.in/showbidDocument/9883056",
  "GEM/2026/B/7953878": "https://bidplus.gem.gov.in/showbidDocument/9797695",
  "GEM/2026/B/8010657": "https://bidplus.gem.gov.in/showbidDocument/9863281",
  "GEM/2026/B/7946719": "https://bidplus.gem.gov.in/showbidDocument/9789258",
  "GEM/2026/B/8044087": "https://bidplus.gem.gov.in/showbidDocument/9901742",
};
const officialHosts = [
  "aiimsbathinda.edu.in", "aiimsbilaspur.edu.in", "bfuhsonline.ac.in",
  "gmcpatiala.edu.in", "gmc.edu.in", "slbsgmchmandi.com", "pgimer.edu.in",
  "rpgmc.ac.in", "igmcshimla.edu.in",
];
export function officialLink(value?: string): string | undefined {
  if (!value) return;
  if (/^\/api\/documents\/bfuhs\/\d+$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return;
    if (!(u.hostname.endsWith(".gov.in") || u.hostname.endsWith(".nic.in") ||
      officialHosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h)))) return;
    // These NIC download actions depend on a live session. Use the tender page instead.
    if (u.searchParams.has("session") ||
      /docDownoad|DirectLink_(?:1|9)$/.test(u.searchParams.get("component") || "")) return;
    return u.href;
  } catch { return; }
}
export function gemBidNumber(t: Tender): string | undefined {
  return [t.tenderId, t.referenceNumber, t.title]
    .filter(Boolean).join(" ").match(/\bGEM[\/-](\d{4})[\/-]([BR])[\/-](\d+)\b/i)
    ?.slice(1).join("/").replace(/^/, "GEM/").toUpperCase();
}
export function isGemTender(t: Tender): boolean {
  return !!gemBidNumber(t) || [t.tenderUrl, t.sourceUrl, ...t.sourceReferences?.map((r) => r.url) || []]
    .some((url) => { try { const h = new URL(url || "").hostname; return h === "gem.gov.in" || h.endsWith(".gem.gov.in"); } catch { return false; } });
}
export function needsManualPortal(t: Tender): boolean {
  const links = [t.tenderUrl, t.sourceUrl, ...t.documents?.map((d) => d.url) || []];
  return links.some((value) => {
    const url = officialLink(value);
    if (!url || url.startsWith("/")) return false;
    const u = new URL(url);
    return /\/(?:eprocure|nicgep)\/app$/.test(u.pathname) &&
      /FrontEndViewTender|FrontEndTenderDetails/.test(u.searchParams.get("page") || "");
  });
}
export interface DocumentLink { label: string; url: string }
export function tenderDocumentLinks(t: Tender): DocumentLink[] {
  const found = new Map<string, DocumentLink>();
  const add = (label: string, value?: string) => {
    const url = officialLink(value);
    if (url && !found.has(url)) found.set(url, { label, url });
  };
  const bid = gemBidNumber(t);
  if (bid) add("Open GeM bid", reviewedGemLinks[bid]);
  for (const ref of t.sourceReferences || []) {
    const url = officialLink(ref.url);
    if (url && new URL(url, "https://gem-tracker-rho.vercel.app").hostname.endsWith(".gem.gov.in")) add("Official GeM link", url);
  }
  add(needsManualPortal(t) ? "Open official tender & documents" : "Official notice", officialLink(t.tenderUrl) || t.sourceUrl);
  for (const d of t.documents || []) add(d.label, d.url);
  for (const d of t.specification?.documentSources || []) add(d.label, d.url);
  for (const c of t.corrigenda || []) add(c.title || "Official corrigendum", c.url);
  return [...found.values()];
}
export type DocumentView = "all" | "gem" | "manual";
export function matchesDocumentView(t: Tender, view: DocumentView): boolean {
  return view === "gem" ? isGemTender(t) : view === "manual" ? needsManualPortal(t) : true;
}
