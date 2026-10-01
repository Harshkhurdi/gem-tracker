import { load } from "cheerio";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";
import { SourceHttp, officialUrl } from "../http";
import { runAdapter } from "../result";
import { parseIndianDate, dayOnly } from "@/lib/tender/dates";
import { classifyMedical } from "@/lib/tender/classifier";
import {
  extractSubmissionDeadline,
  type SubmissionDeadline,
} from "@/lib/tender/deadline";
import { reviewedDocumentDeadline } from "../reviewed-documents";
const bathindaUrl =
  "https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D";
const configs = {
  "aiims-bathinda": {
    name: "AIIMS Bathinda GeM mirror",
    url: bathindaUrl,
    institutionId: "aiims-bathinda",
  },
  bfuhs: {
    name: "BFUHS / GGSMCH notices",
    url: "https://examination.bfuhsonline.ac.in/onlinetender/tenderview.aspx",
    institutionId: "ggsmch-faridkot",
  },
  "gmc-patiala": {
    name: "GMC Patiala institutional notices",
    url: "https://tenders.gmcpatiala.edu.in/",
    institutionId: "gmc-patiala",
  },
  "gmc-amritsar": {
    name: "GMC Amritsar institutional notices",
    url: "https://www.gmc.edu.in/notices",
    institutionId: "gmc-amritsar",
  },
  slbsgmc: {
    name: "SLBSGMCH institutional notices",
    url: "https://www.slbsgmchmandi.com/tender",
    institutionId: "slbsgmch-nerchowk",
  },
} as const;
export type InstitutionSource = keyof typeof configs;
export function parseInstitution(
  html: string,
  key: InstitutionSource,
  fetchedAt: string,
): RawTender[] {
  const config = configs[key];
  const $ = load(html.replace(/<!--[\s\S]*?-->/g, ""));
  let recognized = 0;
  const records: RawTender[] = [];
  $("tr").each((_, row) => {
    const c = $(row).children("td");
    let title = "",
      id = "",
      published: string | undefined,
      end: string | undefined,
      rawDate = "",
      docCell = c;
    if (key === "aiims-bathinda" && c.length === 6) {
      id = c.eq(1).text().trim();
      if (!/^GEM\/\d{4}\/B\/\d+$/.test(id)) return;
      title = c.eq(2).text().trim();
      published = parseIndianDate(c.eq(3).text());
      rawDate = c.eq(4).text().trim();
      end = parseIndianDate(rawDate, true);
      docCell = c.eq(5);
    } else if (
      key === "bfuhs" &&
      c.length === 4 &&
      /^\d+$/.test(c.eq(0).text().trim())
    ) {
      id = c.eq(0).text().trim();
      title = c.eq(2).text().trim();
      published = parseIndianDate(c.eq(1).text());
      docCell = c.eq(3);
    } else if (key === "gmc-patiala" && c.length === 5) {
      published = parseIndianDate(c.eq(0).text());
      title = c.eq(1).text().trim();
      rawDate = c.eq(2).text().trim();
      end = parseIndianDate(rawDate, true);
      docCell = c.eq(3);
    } else if (key === "gmc-amritsar" && c.length === 4) {
      published = parseIndianDate(c.eq(3).text());
      title = c.eq(0).text().trim();
      docCell = c.eq(0);
    } else if (key === "slbsgmc" && c.length === 4) {
      title = c.eq(1).text().trim();
      rawDate = c.eq(2).text().trim();
      end = parseIndianDate(rawDate, true);
      docCell = c.eq(3);
    } else return;
    if (!title || (!published && !end)) return;
    recognized++;
    const docs = docCell
      .find("a[href]")
      .toArray()
      .flatMap((a) => {
        const url = officialUrl($(a).attr("href") || "", config.url);
        return url && /\.pdf(?:$|\?)/i.test(url)
          ? [{ label: $(a).text().trim() || "Official document", url }]
          : [];
      });
    const gem = title.match(/GEM\/\d{4}\/B\/\d+/i)?.[0];
    const notes: string[] = [];
    let institutionId: string | undefined = config.institutionId;
    if (key === "bfuhs") {
      institutionId = undefined;
      notes.push(
        "University notice: the exact hospital assignment requires the official document.",
      );
      if (id) {
        notes.push(
          `BFUHS notice ID: ${id}; document tender reference is not inferred from the notice ID.`,
        );
        docs.push({
          label: "Resolve official PDF",
          url: "/api/documents/bfuhs/" + id,
        });
      }
    }
    if (end && published && Date.parse(end) < Date.parse(published)) {
      end = undefined;
      notes.push(
        "Official listing has an inconsistent deadline; it has not been treated as active.",
      );
    }
    records.push({
      id: key === "bfuhs" ? "bfuhs-" + id : undefined,
      title,
      region: key === "slbsgmc" ? "Himachal Pradesh" : "Punjab",
      institutionId,
      procurementScope: key === "bfuhs" ? "statewide" : "institution",
      sourceId: key,
      sourceName: config.name,
      sourceUrl: config.url,
      tenderUrl: config.url,
      tenderId: gem || (key === "aiims-bathinda" ? id : undefined),
      referenceNumber: undefined,
      publishDate: published,
      originalClosingDate: end,
      datePrecision: dayOnly(rawDate) ? "day" : "minute",
      documents: docs,
      verification: "listing",
      notes,
      fetchedAt,
    });
  });
  if (!recognized) throw Error("Institution table could not be recognised");
  return records;
}
/** Validated public document path observed from BFUHS's own ASP.NET View action. */
export function bfuhsDocumentUrl(id: string, publishDate?: string) {
  const year = publishDate?.slice(0, 4);
  if (!/^\d{1,7}$/.test(id) || !year || !/^20\d{2}$/.test(year)) return;
  return `https://examination.bfuhsonline.ac.in/OnlineTender/tender/${year}/Tender_${id}.pdf`;
}

export function applyInstitutionDocument(
  record: RawTender,
  text: string,
  url: string,
  reviewed?: SubmissionDeadline,
) {
  const documentIds = [
    ...new Set(
      text.match(/GEM\/\d{4}\/B\/\d+/gi)?.map((id) => id.toUpperCase()) || [],
    ),
  ];
  if (
    record.tenderId &&
    documentIds.length &&
    !documentIds.includes(record.tenderId.toUpperCase())
  ) {
    record.notes?.push(
      "Official PDF bid identity differs from this listing; its dates were not applied.",
    );
    return;
  }
  record.description = text.slice(0, 12000);
  record.sourceReferences = [
    {
      sourceId: record.sourceId,
      sourceName: record.sourceName,
      url: record.sourceUrl,
    },
    {
      sourceId: record.sourceId,
      sourceName: "Official procurement document",
      url,
    },
  ];
  const deadline = reviewed || extractSubmissionDeadline(text);
  if (
    deadline &&
    (!record.publishDate ||
      Date.parse(deadline.date) >= Date.parse(record.publishDate))
  ) {
    const listed = record.originalClosingDate;
    // Different calendar dates require amendment evidence; neither original nor mirror wins by assumption.
    if (!listed || listed.slice(0, 10) === deadline.date.slice(0, 10)) {
      record.originalClosingDate = deadline.date;
      record.datePrecision = deadline.datePrecision;
      record.notes?.push(
        `Submission deadline read from official document (${deadline.label}).`,
      );
    } else {
      record.originalClosingDate = undefined;
      record.notes?.push(
        "Document and mirror deadlines differ; closing date remains unknown pending amendment review.",
      );
    }
  } else {
    record.notes?.push(
      "Official PDF inspected; no reliable labelled submission deadline was extractable.",
    );
  }
  record.notes?.push(
    "Separate portal amendments have not been fully checked; document inspection does not verify current active status.",
  );
  // PDF evidence improves a deadline, but an original bid PDF is not complete amendment coverage.
  record.verification = "listing";
}
export function createInstitutionAdapter(
  key: InstitutionSource,
): TenderSourceAdapter {
  const config = configs[key];
  const adapter: TenderSourceAdapter = {
    id: key,
    name: config.name,
    url: config.url,
    institutionIds: [config.institutionId],
    regions: [key === "slbsgmc" ? "Himachal Pradesh" : "Punjab"],
    fetch: () =>
      runAdapter(adapter, async () => {
        const http = new SourceHttp({ budgetMs: 90000, timeoutMs: 30000 });
        let fetchedUrl: string = config.url;
        let html: string;
        if (key === "slbsgmc") {
          try {
            html = await new SourceHttp({
              budgetMs: 22000,
              timeoutMs: 10000,
            }).text(config.url);
          } catch {
            fetchedUrl = "https://slbsgmchmandi.com/tender";
            html = await new SourceHttp({
              budgetMs: 26000,
              timeoutMs: 12000,
            }).text(fetchedUrl);
          }
        } else html = await http.text(config.url);
        const records = parseInstitution(html, key, new Date().toISOString());
        if (fetchedUrl !== config.url)
          for (const record of records) {
            record.sourceUrl = fetchedUrl;
            record.tenderUrl = fetchedUrl;
          }
        const now = Date.now();
        // Only recent relevant notices and still-open mirror rows are worth bounded document work.
        const candidates = records
          .filter(
            (r) =>
              classifyMedical(r.title).isMedical &&
              (!r.originalClosingDate ||
                Date.parse(r.originalClosingDate) >= now),
          )
          .sort(
            (a, b) =>
              Date.parse(b.publishDate || "0") -
              Date.parse(a.publishDate || "0"),
          )
          .slice(0, key === "bfuhs" ? 12 : key === "aiims-bathinda" ? 8 : 6);
        let inspected = 0,
          failures = 0;
        let nextDocument = 0;
        await Promise.all(
          Array.from({ length: Math.min(3, candidates.length) }, async () => {
            while (nextDocument < candidates.length) {
              const r = candidates[nextDocument++];
              try {
                const url =
                  key === "bfuhs"
                    ? bfuhsDocumentUrl(
                        r.id?.replace(/^bfuhs-/, "") || "",
                        r.publishDate,
                      )
                    : r.documents?.find((d) => /\.pdf(?:$|\?)/i.test(d.url))
                        ?.url;
                if (!url) continue;
                const bytes = await http.bytes(url, 8_000_000);
                if (
                  !new TextDecoder()
                    .decode(bytes.slice(0, 5))
                    .startsWith("%PDF")
                )
                  throw Error("Not a PDF");
                inspected++;
                if (key === "bfuhs")
                  r.documents = [{ label: "Official PDF", url }];
                const text = await http.documentBytesText(bytes);
                const reviewed = reviewedDocumentDeadline(url, bytes);
                if (text || reviewed)
                  applyInstitutionDocument(
                    r,
                    text || "",
                    url,
                    reviewed && {
                      date: reviewed.date,
                      datePrecision: reviewed.datePrecision,
                      label: reviewed.evidenceField,
                    },
                  );
                else
                  r.notes?.push(
                    "Official PDF accessible but scanned text could not provide a reliable deadline.",
                  );
                if (reviewed) {
                  if (reviewed.referenceNumber)
                    r.referenceNumber = reviewed.referenceNumber;
                  r.institutionId = reviewed.institutionId;
                  r.procurementScope = "institution";
                  r.notes?.push(
                    `Scanned submission field visually transcribed ${reviewed.reviewedAt}; freshly retrieved PDF SHA-256 matches reviewed document. ${reviewed.legibility} Separate amendments remain unchecked.`,
                  );
                }
              } catch {
                failures++;
              }
            }
          }),
        );
        if (key === "bfuhs")
          return {
            records,
            partial: true,
            notes: [
              `University-wide procurement; ${inspected} of ${candidates.length} bounded recent relevant PDFs inspected (${failures} unavailable). Unverified consignees remain statewide; unknown deadlines are never inferred. Archive documents outside this bounded check remain visible with unknown deadlines.`,
            ],
          };
        return {
          records,
          notes: [
            `Official institutional mirror; ${inspected} of ${candidates.length} bounded relevant PDFs inspected (${failures} unavailable). Separate portal amendments may change the published deadline.`,
          ],
          partial: key !== "aiims-bathinda" || failures > 0,
        };
      }),
  };
  return adapter;
}
