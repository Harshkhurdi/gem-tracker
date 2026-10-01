import type { RawTender, SourceFetchResult } from "../../types/tender";
import type {
  ParsedDocument,
  PriorityDiscoveryMetrics,
  SpecificationDocument,
} from "../../types/specification";
import { SourceHttp, officialUrl } from "../sources/http";
import { bfuhsDocumentUrl } from "../sources/adapters/institution";
import {
  currentCandidate,
  discoveryCategories,
  genericPriorityCandidate,
  priorityCategories,
  priorityRank,
} from "../config/priority-equipment";
import { assignInstitutions } from "../tender/institution-matcher";
import { classifyMedical } from "../tender/classifier";
import {
  extractSubmissionDeadline,
  hasSubmissionDeadlineLabel,
} from "../tender/deadline";
import { extractSpecifications } from "./extract";
import { documentType, fetchDocument, linkedDocuments } from "./documents";

export function documentIdentityMatches(raw: RawTender, text: string): boolean {
  const ids = [
    ...new Set(
      text
        .match(
          /GEM\s*\/\s*\d{4}\s*\/\s*[A-Z]\s*\/\s*\d+|\b20\d{2}_[A-Z0-9]+_\d+_\d+\b/gi,
        )
        ?.map((s) => s.replace(/\s/g, "").toUpperCase()) || [],
    ),
  ];
  return (
    !raw.tenderId || !ids.length || ids.includes(raw.tenderId.toUpperCase())
  );
}
/** Later amendments without a submission field do not undo a prior extension. */
export function latestAmendmentDeadline(documents: ParsedDocument[]) {
  const candidates = documents.flatMap((d) => {
    if (d.type !== "corrigendum" || d.status !== "parsed") return [];
    const text = d.pages.map((p) => p.text).join("\n");
    if (!hasSubmissionDeadlineLabel(text)) return [];
    const deadline = extractSubmissionDeadline(text);
    const published = Date.parse(d.publishedDate || "");
    return [{ deadline, published }];
  });
  const dated = candidates.filter((c) => Number.isFinite(c.published));
  const latest = Math.max(...dated.map((c) => c.published));
  // Undated deadline changes have no defensible order relative to dated ones.
  const authoritative = candidates.filter(
    (c) => !Number.isFinite(c.published) || c.published === latest,
  );
  if (
    authoritative.some((c) => !c.deadline) ||
    new Set(authoritative.map((c) => Date.parse(c.deadline!.date))).size !== 1
  )
    return;
  return authoritative[0]?.deadline;
}

export async function inspectPriorityTender(
  raw: RawTender,
  http: SourceHttp,
): Promise<void> {
  const generic = genericPriorityCandidate(raw);
  let categories = priorityCategories(raw);
  const found = new Map<string, SpecificationDocument>();
  for (const d of raw.documents || []) {
    const url = officialUrl(d.url);
    if (url)
      found.set(url, {
        ...d,
        url,
        type: documentType(d.label, url),
        status: "deferred",
      });
  }
  for (const c of raw.corrigenda || []) {
    const url = c.url && officialUrl(c.url);
    if (url)
      found.set(url, {
        label: c.title || "Official corrigendum",
        url,
        type: "corrigendum",
        publishedDate: c.publishedDate,
        status: "deferred",
      });
  }
  if (raw.sourceId === "bfuhs") {
    const id = raw.id?.replace(/^bfuhs-/, "");
    const url = id && bfuhsDocumentUrl(id, raw.publishDate);
    if (url)
      found.set(url, {
        label: "Official university procurement PDF",
        url,
        type: "tender-document",
        status: "deferred",
      });
  }
  // Follow only official links explicitly exposed by a tender-specific page.
  const detail =
    raw.tenderUrl &&
    /FrontEndViewTender|[?&]tender(?:id|_id)=/i.test(raw.tenderUrl);
  if (
    detail &&
    !raw.documents?.some((d) => /FrontEndTenderDetails/.test(d.url))
  ) {
    try {
      const html = await http.text(raw.tenderUrl!);
      for (const d of linkedDocuments(html, raw.tenderUrl!))
        found.set(d.url, {
          ...d,
          type: documentType(d.label, d.url),
          status: "deferred",
        });
    } catch {
      raw.notes = [
        ...(raw.notes || []),
        "Priority document discovery from official detail was incomplete.",
      ];
    }
  }
  if (!found.size && detail)
    found.set(raw.tenderUrl!, {
      label: "Official tender documents (portal download may require CAPTCHA)",
      url: raw.tenderUrl!,
      type: "tender-document",
      status: "deferred",
    });
  const documents: ParsedDocument[] = [];
  const ordered = [...found.values()].sort(
    (a, b) =>
      Number(b.type === "corrigendum") - Number(a.type === "corrigendum") ||
      Number(b.type === "technical-specification") -
        Number(a.type === "technical-specification") ||
      Number(b.type === "boq") - Number(a.type === "boq"),
  );
  for (let index = 0; index < Math.min(8, ordered.length); index++) {
    const doc = ordered[index];
    // Listing/detail pages are provenance links, not technical documents.
    if (/FrontEndViewTender/.test(doc.url)) {
      documents.push({
        ...doc,
        status: "unavailable",
        pages: [],
        productText: "",
        note: "Official portal documents may require CAPTCHA; no protection was bypassed.",
      });
      continue;
    }
    const parsed = await fetchDocument(http, doc);
    if (
      !documentIdentityMatches(raw, parsed.pages.map((p) => p.text).join("\n"))
    ) {
      documents.push({
        ...parsed,
        status: "unavailable",
        pages: [],
        productText: "",
        note: "Document tender identity differs from the listing; requirements and dates were rejected.",
      });
      continue;
    }
    documents.push(parsed);
    for (const link of parsed.links || []) {
      if (found.has(link.url)) continue;
      const linked = {
        ...link,
        type: documentType(link.label, link.url),
        status: "deferred" as const,
      };
      found.set(link.url, linked);
      ordered.push(linked);
    }
  }
  for (const d of ordered.slice(8))
    documents.push({ ...d, status: "deferred", pages: [], productText: "" });
  // Generic title acceptance requires positive item evidence in its own linked documents.
  const evidence = documents
    .filter((d) => d.status === "parsed" && d.type !== "corrigendum")
    .map((d) => d.productText)
    .join("\n");
  if (generic && evidence) {
    const scope = documents
      .filter((d) => d.status === "parsed" && d.type !== "corrigendum")
      .flatMap((d) =>
        d.type === "boq"
          ? d.pages
              .filter(
                (p) =>
                  /item description|description of item|specification/i.test(
                    p.text,
                  ) && discoveryCategories(p.text).length,
              )
              .map((p) => p.text)
          : /Item Category|^\s*Technical Specifications?/im.test(
                d.pages.map((p) => p.text).join("\n"),
              )
            ? [d.productText]
            : [],
      )
      .join("\n");
    const medical = classifyMedical(scope, scope, raw);
    if (scope && medical.isMedical) {
      raw.documentProductScope = scope.slice(0, 28000);
      raw.description = [raw.description, evidence.slice(0, 28000)]
        .filter(Boolean)
        .join("\n");
      categories = priorityCategories(raw);
    }
  }
  raw.specification = extractSpecifications(documents, categories);
  // Apply only labelled submission fields, with amendment precedence and identity guard.
  const deadline = latestAmendmentDeadline(documents);
  if (deadline) {
    if (!raw.publishDate || Date.parse(deadline.date) >= Date.parse(raw.publishDate)) {
      raw.extendedClosingDate = deadline.date;
      raw.datePrecision = deadline.datePrecision;
      raw.verification = "listing";
      raw.notes = [
        ...(raw.notes || []),
        "Priority closing date read from linked official amendment; separate portal amendment coverage remains incomplete.",
      ];
    }
  }
  if (raw.datePrecision === "day" && !raw.extendedClosingDate) {
    const reviewed = documents
      .filter((d) => d.textMethod === "reviewed-scan")
      .map((d) =>
        extractSubmissionDeadline(d.pages.map((p) => p.text).join("\n")),
      )
      .find(
        (d) => d?.date.slice(0, 10) === raw.originalClosingDate?.slice(0, 10),
      );
    if (reviewed) {
      raw.originalClosingDate = reviewed.date;
      raw.datePrecision = reviewed.datePrecision;
      raw.verification = "listing";
      raw.notes = [
        ...(raw.notes || []),
        "Exact submission time from visually reviewed unchanged official scan; later amendments remain unverified.",
      ];
    }
  }
  if (!raw.originalClosingDate && !raw.extendedClosingDate) {
    const deadlines = documents
      .filter((d) => d.status === "parsed" && d.type !== "corrigendum")
      .map((d) =>
        extractSubmissionDeadline(d.pages.map((p) => p.text).join("\n")),
      )
      .filter((d) => !!d);
    const dates = new Set(deadlines.map((d) => d.date));
    // Preserve the existing reviewed mirror conflict: an old original PDF is not a current deadline.
    if (
      dates.size === 1 &&
      !raw.notes?.some((n) =>
        /conflict|deadlines differ|deadline.*unknown pending/i.test(n),
      )
    ) {
      const d = deadlines[0];
      if (
        !raw.publishDate ||
        Date.parse(d.date) >= Date.parse(raw.publishDate)
      ) {
        raw.originalClosingDate = d.date;
        raw.datePrecision = d.datePrecision;
        raw.verification = "listing";
      }
    }
  }
  raw.priorityCategories = categories;
}
const inspectionCursors = new Map<string, number>();
export async function processPrioritySource(
  source: SourceFetchResult,
  now = Date.now(),
  http = new SourceHttp({ budgetMs: 55000, timeoutMs: 16000 }),
): Promise<SourceFetchResult> {
  const started = Date.now();
  const metrics: PriorityDiscoveryMetrics = {
    rawCandidates: {},
    genericCandidates: 0,
    inspectedCandidates: 0,
    rejectedCandidates: 0,
    deferredCandidates: 0,
  };
  const candidates = source.records
    .filter((raw) => {
      if (
        !assignInstitutions(raw).length &&
        raw.procurementScope !== "statewide"
      )
        return false;
      const types = discoveryCategories(raw.title);
      for (const c of types)
        metrics.rawCandidates[c] = (metrics.rawCandidates[c] || 0) + 1;
      const generic = genericPriorityCandidate(raw);
      if (generic) metrics.genericCandidates++;
      if (types.length && !classifyMedical(raw.title, raw.title, raw).isMedical)
        metrics.rejectedCandidates++;
      return (
        currentCandidate(raw, now) &&
        (priorityCategories(raw).length > 0 || generic)
      );
    })
    .sort(
      (a, b) =>
        priorityRank(b, now) - priorityRank(a, now) ||
        Date.parse(b.publishDate || "0") - Date.parse(a.publishDate || "0"),
    );
  // More than routine metadata work, with a fixed per-source budget and concurrency.
  const offset =
    (inspectionCursors.get(source.sourceId) || 0) %
    Math.max(1, candidates.length);
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const selected = rotated.slice(0, 16);
  metrics.deferredCandidates = candidates.length - selected.length;
  if (candidates.length > 16)
    inspectionCursors.set(source.sourceId, offset + 16);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, selected.length) }, async () => {
      while (next < selected.length) {
        const r = selected[next++];
        try {
          if (!r.specification) await inspectPriorityTender(r, http);
          metrics.inspectedCandidates++;
        } catch {
          r.notes = [
            ...(r.notes || []),
            "Priority inspection incomplete; source processing budget exhausted.",
          ];
        }
      }
    }),
  );
  for (const raw of rotated.slice(16))
    raw.specification = {
      extractionStatus: "not-processed",
      equipmentTypes: priorityCategories(raw),
      sections: {
        technicalRequirements: [],
        accessories: [],
        consumables: [],
        serviceRequirements: [],
        warranty: [],
        cmc: [],
        regulatoryRequirements: [],
        bidderEligibility: [],
        delivery: [],
        commercialTerms: [],
        quantity: [],
      },
      documentSources: [],
      notes: [
        "Deferred by the per-source processing budget; will be reconsidered on refresh.",
      ],
      supersededRequirements: [],
    };
  return {
    ...source,
    priorityDiscovery: metrics,
    durationMs: source.durationMs + Date.now() - started,
    notes: [
      ...source.notes,
      `Priority inspection: ${metrics.inspectedCandidates} current candidates checked; ${metrics.genericCandidates} generic titles considered; ${metrics.deferredCandidates} candidates deferred. Technical availability is reported separately from listing coverage.`,
    ],
  };
}
export function linkRetenders(records: RawTender[]): void {
  for (const raw of records) {
    if (
      !currentCandidate(raw) ||
      !priorityCategories(raw).length ||
      !/re[ -]?tender|fresh tender|re.invited|recalled|reissued/i.test(
        raw.title + " " + raw.referenceNumber,
      )
    )
      continue;
    const scope = raw.institutionId || raw.organisation;
    const signature = raw.title
      .toLowerCase()
      .replace(/re[ -]?tender|fresh tender|re.invited|recalled|reissued/g, "")
      .replace(/[^a-z0-9]/g, "");
    const previous = records.find(
      (r) =>
        r !== raw &&
        (r.cancelled || r.withdrawn) &&
        scope === (r.institutionId || r.organisation) &&
        r.title
          .toLowerCase()
          .replace(
            /re[ -]?tender|fresh tender|re.invited|recalled|reissued/g,
            "",
          )
          .replace(/[^a-z0-9]/g, "") === signature,
    );
    if (previous)
      raw.notes = [
        ...(raw.notes || []),
        `Possible replacement for cancelled ${previous.tenderId || previous.referenceNumber || previous.title}; fresh reference retained as a separate tender.`,
      ];
  }
}
