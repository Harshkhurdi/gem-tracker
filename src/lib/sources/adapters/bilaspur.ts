import * as cheerio from "cheerio";
import type {
  RawTender,
  SourceFetchResult,
  TenderSourceAdapter,
} from "@/types/tender";
import {
  parseIndianDate,
  dayOnly,
  closingDeadlineTimestamp,
} from "@/lib/tender/dates";
import { extractSubmissionDeadline } from "@/lib/tender/deadline";
import { classifyMedical } from "@/lib/tender/classifier";
import { SourceHttp, sanitizeError } from "../http";

type Kind = "gem" | "cppp" | "niq";
const origin = "https://www.aiimsbilaspur.edu.in";
const paths: Record<Kind, string> = {
  gem: "/procurement/tender/gem",
  cppp: "/procurement/tender/cppp",
  niq: "/procurement/niq",
};
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const present = (s: string) => !!s && !/^[-–]+$/.test(s);
const names: Record<Kind, string> = {
  gem: "AIIMS Bilaspur GeM",
  cppp: "AIIMS Bilaspur CPPP",
  niq: "AIIMS Bilaspur NIQ",
};
// Public official PDFs audited on 2026-10-01 contradict these exact listing
// revisions. Retain that review across transient PDF failures. These are not
// replacement deadlines: no current closing date is inferred from an old PDF.
const reviewedConflicts = [
  { documentName: "GeM tender for the Procurement of Endoscopic Spine System for the Department of Orthopaedics GeM bid No. GEM-2026-B-7421096..pdf", published: "2026-05-09", listed: "2026-11-09", documentDeadline: "2026-05-09T17:00:00+05:30", bid: "GEM/2026/B/7421096" },
  { documentName: "GeM tender for the Procurement of Double Lumen Dialysis Catheter for the Department of Nephrology and Dialysis, AIIMS Bilaspur (H.P.) Vide GeM bid No..pdf", published: "2026-05-11", listed: "2026-11-11", documentDeadline: "2026-05-11T16:00:00+05:30", bid: "GEM/2026/B/7439204" },
  { documentName: "GeM tender for the Procurement of Target Controlled Infusion Pumps for the Dept. of Anaesthesiology, AIIMS Bilaspur (H.P.).pdf", published: "2026-05-11", listed: "2026-11-11", documentDeadline: "2026-05-11T17:00:00+05:30", bid: "GEM/2026/B/7410483" },
];
function reviewedConflict(documents: RawTender["documents"], published?: string) {
  return reviewedConflicts.find((e) => published?.slice(0, 10) === e.published && documents?.some((d) => {
    try { return decodeURIComponent(new URL(d.url).pathname) === `/sites/default/files/2026-05/${e.documentName}`; }
    catch { return false; }
  }));
}

function officialUrl(href: string, base: string): string | undefined {
  try {
    const u = new URL(href, base);
    if (
      u.protocol === "https:" &&
      /^(www\.)?aiimsbilaspur\.edu\.in$/.test(u.hostname)
    )
      return u.href;
  } catch {}
}

export function parseBilaspur(
  html: string,
  url: string,
  kind: Kind,
  fetchedAt: string,
): RawTender[] {
  const $ = cheerio.load(html);
  const records: RawTender[] = [];
  $("#procurementTable tbody tr, #procurementTable > tr").each((_, row) => {
    const cells = $(row).children("td");
    if (cells.length !== 9) return;
    const value = (i: number) => clean(cells.eq(i).text());
    const title = value(2);
    if (!title) return;
    const notes: string[] = [];
    const publishDate = parseIndianDate(value(4));
    let originalClosingDate = parseIndianDate(value(5), dayOnly(value(5)));
    let extendedClosingDate = parseIndianDate(value(6), dayOnly(value(6)));
    for (const [label, i, parsed] of [
      ["publication", 4, publishDate],
      ["closing", 5, originalClosingDate],
      ["extension", 6, extendedClosingDate],
    ] as const)
      if (present(value(i)) && !parsed)
        notes.push(`Invalid ${label} date in official listing: ${value(i)}`);
    if (
      publishDate &&
      originalClosingDate &&
      new Date(originalClosingDate) < new Date(publishDate)
    ) {
      notes.push(
        "Closing date precedes publication; deadline requires verification.",
      );
      originalClosingDate = undefined;
    }
    if (
      extendedClosingDate &&
      ((publishDate && new Date(extendedClosingDate) < new Date(publishDate)) ||
        (originalClosingDate &&
          new Date(extendedClosingDate) < new Date(originalClosingDate)))
    ) {
      notes.push(
        "Extended date precedes publication or original deadline; requires verification.",
      );
      extendedClosingDate = undefined;
    }
    const documents: { label: string; url: string }[] = [];
    const corrigenda: NonNullable<RawTender["corrigenda"]> = [];
    cells
      .eq(7)
      .find("a[href]")
      .each((_, a) => {
        const link = $(a);
        const documentUrl = officialUrl(link.attr("href") || "", url);
        if (!documentUrl) return;
        const label = clean(link.text()) || "Official tender document";
        documents.push({ label, url: documentUrl });
        if (/corrig|addendum|extension|cancel|withdraw/i.test(label)) {
          const metadata = clean(
            link.closest("li").length
              ? link.closest("li").text()
              : link.parent().text(),
          );
          const published = metadata.match(
            /Published Date\s*:\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
          );
          corrigenda.push({
            title: label,
            url: documentUrl,
            publishedDate: published
              ? parseIndianDate(published[1])
              : undefined,
            type: /cancel/i.test(label)
              ? "cancellation"
              : /withdraw/i.test(label)
                ? "withdrawal"
                : /extension/i.test(label)
                  ? "extension"
                  : "corrigendum",
          });
        }
      });
    if (corrigenda.length && !extendedClosingDate)
      notes.push(
        "Attached corrigendum requires review; listing has no verified extended deadline.",
      );
    const referenceNumber = present(value(1)) ? value(1) : undefined;
    const bid = (referenceNumber + " " + title)
      .match(/GEM\s*\/\s*\d{4}\s*\/\s*[A-Z]\s*\/\s*\d+/i)?.[0]
      .replace(/\s/g, "")
      .toUpperCase();
    const cppp = (referenceNumber + " " + title).match(
      /\b\d{4}_[A-Z0-9]+_\d+_\d+\b/i,
    )?.[0];
    const reviewed = kind === "gem" ? reviewedConflict(documents, publishDate) : undefined;
    const matchesReviewedConflict = reviewed && !extendedClosingDate && originalClosingDate?.slice(0, 10) === reviewed.listed;
    if (matchesReviewedConflict) {
      notes.push(`Reviewed deadline conflict: listing ${originalClosingDate}; original bid document ${reviewed.documentDeadline}. Current deadline requires verification.`);
      originalClosingDate = undefined;
    }
    const statusText = [
      title,
      value(8),
      ...corrigenda.map((c) => c.title),
    ].join(" ");
    records.push({
      title,
      referenceNumber,
      tenderId: bid || cppp || (matchesReviewedConflict ? reviewed?.bid : undefined),
      sourceId: `aiims-bilaspur-${kind}`,
      sourceName: names[kind],
      sourceUrl: url,
      tenderUrl: documents[0]?.url || url,
      region: "Himachal Pradesh",
      institutionId: "aiims-bilaspur",
      procurementScope: "institution",
      organisation: "All India Institute of Medical Sciences, Bilaspur",
      location: "Bilaspur, Himachal Pradesh",
      publishDate,
      originalClosingDate,
      extendedClosingDate,
      documents,
      corrigenda,
      verification: "listing",
      datePrecision: dayOnly(extendedClosingDate ? value(6) : value(5))
        ? "day"
        : "minute",
      cancelled:
        /\b(cancelled|canceled|cancellation)\b/i.test(statusText) || undefined,
      withdrawn: /\b(withdrawn|withdrawal)\b/i.test(statusText) || undefined,
      notes,
      fetchedAt,
    });
  });
  return records;
}

export function createBilaspurAdapter(kind: Kind): TenderSourceAdapter {
  const id = `aiims-bilaspur-${kind}`;
  const name = names[kind];
  const url = origin + paths[kind];
  return {
    id,
    name,
    url,
    institutionIds: ["aiims-bilaspur"],
    regions: ["Himachal Pradesh"],
    async fetch(): Promise<SourceFetchResult> {
      const started = Date.now();
      const attemptedAt = new Date().toISOString();
      const http = new SourceHttp({ budgetMs: 90000, timeoutMs: 18000 });
      const records: RawTender[] = [];
      const notes: string[] = [];
      let partial = false;
      let detailChecks = 0;
      let fetchedPages = 0;
      let error: string | undefined;
      for (let page = 0; page < 10; page++) {
        const pageUrl = page ? `${url}?page=${page}` : url;
        try {
          const html = await http.text(pageUrl);
          const $ = cheerio.load(html);
          if (!$("#procurementTable").length)
            throw new Error(
              "Official procurement table missing from response.",
            );
          const pageRecords = parseBilaspur(html, pageUrl, kind, attemptedAt);
          let unreadableRows = 0;
          $("#procurementTable tbody tr, #procurementTable > tr").each(
            (_, row) => {
              const cells = $(row).children("td");
              if (!cells.length) return; // Header rows are not procurement records.
              if (
                cells.length === 1 &&
                /^(?:no (?:data|records|tenders|procurements)(?: (?:available|found))?(?: in table)?|nothing found)[.!]?$/i.test(
                  clean(cells.text()),
                )
              )
                return;
              if (cells.length !== 9 || !clean(cells.eq(2).text()))
                unreadableRows++;
            },
          );
          if (unreadableRows && !pageRecords.length)
            throw new Error(
              "Official procurement table structure changed; populated rows could not be read.",
            );
          if (unreadableRows) {
            partial = true;
            notes.push(
              `${unreadableRows} official procurement rows could not be read because their structure changed.`,
            );
          }
          fetchedPages++;
          records.push(...pageRecords);
          const nextPages = $("a[href]")
            .toArray()
            .map((a) => officialUrl($(a).attr("href") || "", pageUrl))
            .filter((u): u is string => !!u)
            .filter((u) => new URL(u).pathname === new URL(url).pathname)
            .map((u) => Number(new URL(u).searchParams.get("page") || 0));
          if (!nextPages.some((n) => n > page)) break;
          if (page === 9) {
            partial = true;
            notes.push(
              "Pagination capped at ten pages; additional official records remain unchecked.",
            );
          }
        } catch (e) {
          error = sanitizeError(e);
          partial = true;
          notes.push(`Page ${page + 1} unavailable: ${error}`);
          break;
        }
      }
      // Read only expressly labelled deadlines; arbitrary dates in specifications are never deadlines.
      const promising = records.filter(
        (r) =>
          classifyMedical(r.title).isMedical &&
          !r.cancelled &&
          !r.withdrawn &&
          (!r.originalClosingDate ||
            closingDeadlineTimestamp(
              r.datePrecision === "day"
                ? (r.extendedClosingDate || r.originalClosingDate)?.slice(0, 10)
                : r.extendedClosingDate || r.originalClosingDate,
            ) >= Date.now() ||
            r.corrigenda?.length),
      );
      const deferredDocuments = promising
        .slice(12)
        .filter(
          (r) =>
            r.documents?.length ||
            r.corrigenda?.some(
              (c) => /extension/i.test(c.title || "") && c.url,
            ),
        ).length;
      if (deferredDocuments) {
        partial = true;
        notes.push(
          `${deferredDocuments} relevant document checks deferred by the twelve-record document limit.`,
        );
      }
      const candidates = promising.slice(0, 12);
      for (let offset = 0; offset < candidates.length; offset += 3) {
        await Promise.all(
          candidates.slice(offset, offset + 3).map(async (r) => {
            const correction = [...(r.corrigenda || [])]
              .reverse()
              .sort(
                (a, b) =>
                  Date.parse(b.publishedDate || "") -
                  Date.parse(a.publishedDate || ""),
              )[0];
            const docUrl = correction?.url || r.documents?.[0]?.url;
            if (!docUrl) return;
            detailChecks++;
            try {
              const text = await http.documentText(docUrl);
              const documentBid = text
                ?.match(/GEM\s*\/\s*\d{4}\s*\/\s*[A-Z]\s*\/\s*\d+/i)?.[0]
                .replace(/\s/g, "")
                .toUpperCase();
              if (
                r.tenderId?.startsWith("GEM/") &&
                documentBid &&
                r.tenderId !== documentBid
              ) {
                partial = true;
                r.notes?.push(
                  "Attached document bid identity differs from listing; deadline not applied.",
                );
                return;
              }
              if (!r.tenderId && documentBid) r.tenderId = documentBid;
              const extracted = text
                ? extractSubmissionDeadline(text)
                : undefined;
              const deadline = extracted?.date;
              const reviewed = reviewedConflict(r.documents, r.publishDate);
              if (
                reviewed &&
                r.notes?.some((note) => note.startsWith("Reviewed deadline conflict:")) &&
                (correction
                  ? documentBid !== reviewed.bid || !deadline
                  : !deadline || deadline.slice(0, 10) !== reviewed.listed)
              ) {
                partial = true;
                return;
              }
              if (deadline) {
                if (correction) {
                  if (
                    r.extendedClosingDate &&
                    r.extendedClosingDate.slice(0, 10) !== deadline.slice(0, 10)
                  ) {
                    partial = true;
                    r.notes?.push(
                      `Attached amendment deadline ${deadline} differs from current listed extension ${r.extendedClosingDate}; listing extension retained pending review.`,
                    );
                    return;
                  }
                  r.extendedClosingDate = deadline;
                  correction.revisedClosingDate = deadline;
                } else if (!r.extendedClosingDate) {
                  if (
                    r.originalClosingDate &&
                    r.originalClosingDate.slice(0, 10) !== deadline.slice(0, 10)
                  ) {
                    // A currently listed date may be an unlinked amendment. Neither
                    // conflicting source supports an actionable deadline on its own.
                    r.notes?.push(
                      `Deadline conflict: listing ${r.originalClosingDate}; original bid document ${deadline}. Current deadline requires verification.`,
                    );
                    r.originalClosingDate = undefined;
                    partial = true;
                    return;
                  }
                  r.originalClosingDate = deadline;
                }
                if (correction || !r.extendedClosingDate)
                  r.datePrecision = extracted!.datePrecision;
                r.verification = "listing";
                r.notes?.push(
                  "Deadline read from explicitly labelled official document field.",
                );
              } else {
                partial = true;
                notes.push(
                  "An attached document could not be read or its deadline could not be verified; affected tender retains listing verification.",
                );
              }
            } catch {
              partial = true;
              notes.push(
                "Some document checks failed; listing records retained.",
              );
            }
          }),
        );
      }
      if (records.some((r) => r.corrigenda?.length && !r.extendedClosingDate)) {
        partial = true;
        notes.push(
          "Some attached corrigenda require document review for current deadlines.",
        );
      }
      const listingAvailable = fetchedPages > 0 && !(error && !records.length);
      return {
        sourceId: id,
        sourceName: name,
        status: listingAvailable
          ? partial
            ? "PARTIAL"
            : "SUCCESS"
          : "UNAVAILABLE",
        records,
        attemptedAt,
        successfulAt: listingAvailable ? new Date().toISOString() : undefined,
        error,
        notes,
        metrics: {
          rawRecords: records.length,
          institutionMatches: 0,
          medicalMatches: 0,
          falsePositivesRejected: 0,
          unassignedRejected: 0,
          detailChecks,
        },
        durationMs: Date.now() - started,
      };
    },
  };
}
