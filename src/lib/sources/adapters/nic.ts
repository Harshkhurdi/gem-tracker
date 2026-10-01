import * as cheerio from "cheerio";
import type {
  RawTender,
  Region,
  TenderSourceAdapter,
  SourceFetchResult,
  Corrigendum,
} from "@/types/tender";
import { parseIndianDate, dayOnly } from "@/lib/tender/dates";
import { matchInstitutions } from "@/lib/tender/institution-matcher";
import { classifyMedical } from "@/lib/tender/classifier";
import { SourceHttp, sanitizeError } from "../http";
export interface NicConfig {
  id: string;
  name: string;
  origin: string;
  prefix: string;
  organisation: RegExp;
  region: Region;
  institutionIds: string[];
  statewide?: boolean;
}
const clean = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "");
const normalized = (s: string) => s.replace(/\s+/g, " ").trim();
const absolute = (url: string, base: string) => new URL(url, base).href;
const publicUrl = (url: string) => {
  const u = new URL(url);
  u.searchParams.delete("session");
  u.pathname = u.pathname.replace(/;jsessionid=[^/?]+/i, "");
  return u.href;
};
const sessionUrl = (url: string) => {
  const u = new URL(url);
  u.searchParams.set("session", "T");
  return u.href;
};
const matchingRegion = (raw: RawTender) =>
  raw.sourceId === "cppp-pgimer" ? undefined : raw.region;
const textOf = (raw: RawTender) =>
  [
    raw.title,
    raw.description,
    raw.organisation,
    ...(raw.organisationChain || []),
    raw.location,
    raw.referenceNumber,
  ]
    .filter(Boolean)
    .join(" ");
function cells(html: string) {
  const $ = cheerio.load(clean(html));
  const map = new Map<string, string>();
  $("tr").each((_, tr) => {
    const td = $(tr).children("td");
    td.each((i, node) => {
      const k = normalized($(node).text());
      if (k && td.eq(i + 1).length && !map.has(k))
        map.set(k, normalized(td.eq(i + 1).text()));
    });
  });
  return { $, map };
}
export function parseNicList(
  html: string,
  baseUrl: string,
  config: NicConfig,
  fetchedAt: string,
): RawTender[] {
  const $ = cheerio.load(clean(html));
  const records: RawTender[] = [];
  const seen = new Set<string>();
  $("tr").each((_, tr) => {
    const td = $(tr).children("td");
    if (td.length < 6) return;
    const combined = normalized(td.eq(4).text());
    const id = combined.match(/\b20\d{2}_[A-Z0-9]+_\d+_\d+\b/)?.[0];
    const a = td.eq(4).find("a[href]").first();
    if (!id || !a.length || seen.has(id)) return;
    const title = normalized(a.text())
      .replace(/^\[|\]$/g, "")
      .trim();
    if (!title) return;
    seen.add(id);
    const link = absolute(a.attr("href")!, baseUrl);
    const org = normalized(td.eq(5).text());
    const brackets = [...combined.matchAll(/\[([^\]]+)\]/g)].map((m) =>
      m[1].trim(),
    );
    const close = td.eq(2).text();
    records.push({
      title,
      region: config.region,
      sourceId: config.id,
      sourceName: config.name,
      sourceUrl: publicUrl(link),
      tenderUrl: publicUrl(link),
      tenderId: id,
      referenceNumber: brackets.length >= 3 ? brackets.at(-2) : undefined,
      organisation: org,
      organisationChain: org.split("||").map((s) => s.trim()),
      publishDate: parseIndianDate(td.eq(1).text()),
      originalClosingDate: parseIndianDate(close, true),
      bidOpeningDate: parseIndianDate(td.eq(3).text()),
      verification: "listing",
      datePrecision: dayOnly(close) ? "day" : "minute",
      fetchedAt,
      procurementScope: config.statewide ? "statewide" : undefined,
    });
  });
  return records;
}
export function enrichNicDetail(
  raw: RawTender,
  html: string,
  url: string,
): RawTender {
  const { $, map } = cells(html);
  if (!map.get("Tender ID"))
    throw new Error(
      "Tender detail not present (session expired or access challenge)",
    );
  if (map.get("Tender ID") !== raw.tenderId)
    throw new Error("Tender detail ID mismatch");
  const org = map.get("Organisation Chain") || raw.organisation;
  const location = map.get("Location") || raw.location;
  const matched = matchInstitutions(
    [
      raw.title,
      map.get("Title"),
      map.get("Work Description"),
      org,
      location,
      raw.referenceNumber,
    ]
      .filter(Boolean)
      .join(" "),
    matchingRegion(raw),
  );
  const deadline = map.get("Bid Submission End Date");
  const corrigenda: Corrigendum[] = [];
  $("#corrigendumDocumenttable tr").each((_, tr) => {
    const td = $(tr).children("td");
    const a = td.find("a[href]").first();
    if (td.length >= 4 && a.length)
      corrigenda.push({
        title: normalized(td.eq(1).text()),
        type: normalized(td.eq(2).text()),
        url: publicUrl(absolute(a.attr("href")!, url)),
      });
  });
  const statusText = [
    map.get("Tender Status"),
    map.get("Status"),
    ...corrigenda.map((c) => `${c.title} ${c.type}`),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ...raw,
    procurementScope:
      matched.length > 1
        ? "multi-institution"
        : matched.length === 1
          ? "institution"
          : raw.procurementScope,
    consignees: matched.length
      ? matched.map((i) => ({ institutionId: i.id, name: i.name }))
      : raw.consignees,
    title: map.get("Title") || raw.title,
    description: [
      map.get("Work Description") || raw.description,
      map.get("Product Category") === "Medical Equipments/Waste"
        ? "Medical equipment procurement category"
        : undefined,
    ]
      .filter(Boolean)
      .join(" "),
    organisation: org,
    organisationChain: org?.split("||").map((s) => s.trim()),
    location,
    referenceNumber: map.get("Tender Reference Number") || raw.referenceNumber,
    publishDate:
      parseIndianDate(map.get("Published Date") || "") || raw.publishDate,
    originalClosingDate:
      parseIndianDate(deadline || "", true) || raw.originalClosingDate,
    bidOpeningDate:
      parseIndianDate(map.get("Bid Opening Date") || "") || raw.bidOpeningDate,
    datePrecision: deadline
      ? dayOnly(deadline)
        ? "day"
        : "minute"
      : raw.datePrecision,
    corrigenda,
    cancelled: /\bcancel(?:led|lation|ed)\b/i.test(statusText),
    withdrawn: /\bwithdraw(?:n|al)\b/i.test(statusText),
    verification: "detail",
    sourceUrl: publicUrl(url),
    tenderUrl: publicUrl(url),
    documents: [
      {
        label:
          "Official tender documents (portal download may require CAPTCHA)",
        url: publicUrl(url),
      },
    ],
    notes: [
      ...(raw.notes || []),
      "Official critical dates checked; document CAPTCHA is not bypassed.",
    ],
  };
}
export function parseNicCorrigendum(
  html: string,
  url: string,
  tenderId: string,
): Corrigendum {
  const stripped = clean(html).split(/Details Before Corrigendum/i)[0];
  const { $, map } = cells(stripped);
  const body = normalized($.root().text());
  if (!/Published Corrigendum Details/i.test(body))
    throw new Error("Corrigendum detail unavailable");
  if ((map.get("Tender ID :") || map.get("Tender ID")) !== tenderId)
    throw new Error("Corrigendum tender ID mismatch or missing");
  const rows = $("tr")
    .toArray()
    .map((tr) =>
      $(tr)
        .children("td")
        .toArray()
        .map((td) => normalized($(td).text())),
    )
    .filter((r) =>
      r.some((v) => /\d{2}-[A-Za-z]{3}-20\d{2} \d{2}:\d{2}/.test(v)),
    );
  const published = rows
    .flat()
    .find((v) => /^\d{2}-[A-Za-z]{3}-20\d{2} \d{2}:\d{2} [AP]M$/.test(v));
  return {
    url: publicUrl(url),
    revisedClosingDate: parseIndianDate(
      map.get("Bid Submission End Date") || "",
      true,
    ),
    publishedDate: parseIndianDate(published || ""),
  };
}
export function createNicAdapter(config: NicConfig): TenderSourceAdapter {
  return {
    id: config.id,
    name: config.name,
    url: config.origin,
    institutionIds: config.institutionIds,
    regions: [config.region],
    async fetch() {
      const start = Date.now(),
        attemptedAt = new Date().toISOString();
      const notes: string[] = [];
      const records: RawTender[] = [];
      const metrics = {
        rawRecords: 0,
        institutionMatches: 0,
        medicalMatches: 0,
        falsePositivesRejected: 0,
        unassignedRejected: 0,
        detailChecks: 0,
      };
      let partial = false;
      const result = (
        status: SourceFetchResult["status"],
        error?: string,
      ): SourceFetchResult => ({
        sourceId: config.id,
        sourceName: config.name,
        status,
        records,
        attemptedAt,
        successfulAt:
          status !== "UNAVAILABLE" ? new Date().toISOString() : undefined,
        error,
        notes,
        metrics,
        durationMs: Date.now() - start,
      });
      try {
        const http = new SourceHttp({ budgetMs: 60000, timeoutMs: 18000 });
        const endpoint = config.prefix.replace(/\/$/, "").endsWith("/app")
          ? config.prefix.replace(/\/$/, "")
          : `${config.prefix.replace(/\/$/, "")}/app`;
        const indexUrl = absolute(
          `${endpoint}?page=FrontEndTendersByOrganisation&service=page`,
          config.origin,
        );
        const index = await http.text(indexUrl);
        const $ = cheerio.load(clean(index));
        const links: string[] = [];
        const expectedCounts = new Map<string, number>();
        let matchingOrganisations = 0,
          successfulListings = 0;
        $("tr").each((_, tr) => {
          const td = $(tr).children("td");
          if (td.length !== 3) return;
          config.organisation.lastIndex = 0;
          if (!config.organisation.test(normalized(td.eq(1).text()))) return;
          matchingOrganisations++;
          const countText = normalized(td.eq(2).text());
          const count = /^\d+$/.test(countText) ? Number(countText) : undefined;
          const a = td.eq(2).find("a[href]").first();
          if (a.length) {
            const url = absolute(a.attr("href")!, indexUrl);
            links.push(url);
            const linkedCount = normalized(a.text());
            if (/^\d+$/.test(linkedCount))
              expectedCounts.set(url, Number(linkedCount));
            else {
              partial = true;
              notes.push(
                "Matching organisation active count could not be read.",
              );
            }
          } else if (count === 0) {
            successfulListings++;
          } else {
            partial = true;
            notes.push(
              "Matching organisation has no readable active-count link.",
            );
          }
        });
        if (!/Tenders by Organisation/i.test($.root().text()))
          throw new Error("Organisation listing unavailable or challenged");
        if (!matchingOrganisations)
          throw new Error(
            "Requested organisation is absent from the official index",
          );
        if (links.length > 8) {
          partial = true;
          notes.push("Organisation traversal capped at 8 matching chains.");
        }
        for (const url of links.slice(0, 8)) {
          try {
            const list = await http.text(url);
            if (
              !/S\.No|Tender ID|Organisation Chain/i.test(
                cheerio.load(clean(list)).root().text(),
              )
            ) {
              partial = true;
              notes.push(
                "Organisation response did not contain a tender listing.",
              );
              continue;
            }
            const found = parseNicList(list, url, config, attemptedAt);
            successfulListings++;
            records.push(...found);
            if (found.length < (expectedCounts.get(url) || 0)) {
              partial = true;
              notes.push(
                "Organisation count exceeds parsed listing rows; additional pages or a source change may remain.",
              );
            }
          } catch (e) {
            partial = true;
            notes.push(
              `Organisation fetch failed: ${sanitizeError(e)}`,
            );
          }
        }
        if (!successfulListings || (!records.length && partial))
          return result(
            "UNAVAILABLE",
            "No complete official organisation listing could be read",
          );
        const dedup = [
          ...new Map(records.map((r) => [r.tenderId, r])).values(),
        ];
        records.splice(0, records.length, ...dedup);
        metrics.rawRecords = records.length;
        const candidates = records.filter((raw) => {
          const text = textOf(raw);
          const assigned =
            matchInstitutions(text, matchingRegion(raw)).length > 0 ||
            !!config.statewide;
          const medical =
            classifyMedical(text, raw.title).isMedical ||
            /\b(?:equipment|machineries|DIAMONDS)\b/i.test(raw.title);
          if (assigned) metrics.institutionMatches++;
          else metrics.unassignedRejected++;
          if (medical) metrics.medicalMatches++;
          else metrics.falsePositivesRejected++;
          return assigned && medical;
        });
        if (candidates.length > 12) {
          partial = true;
          notes.push(
            `${candidates.length - 12} relevant detail checks deferred by the 12-detail limit.`,
          );
        }
        let next = 0;
        await Promise.all(
          Array.from(
            { length: Math.min(3, candidates.length, 12) },
            async () => {
              while (next < Math.min(12, candidates.length)) {
                const raw = candidates[next++];
                const index = records.indexOf(raw);
                try {
                  const url = raw.tenderUrl!;
                  const html = await http.text(sessionUrl(url));
                  let enriched = enrichNicDetail(raw, html, url);
                  metrics.detailChecks++;
                  let corrFailure = false;
                  const needed = (enriched.corrigenda || []).filter((c) =>
                    /date|extend|cancel|withdraw/i.test(`${c.type} ${c.title}`),
                  );
                  if (needed.length > 2) {
                    partial = true;
                    corrFailure = true;
                    notes.push(
                      `Corrigendum checks capped for ${raw.tenderId}.`,
                    );
                  }
                  for (const c of needed.slice(0, 2)) {
                    try {
                      const detail = parseNicCorrigendum(
                        await http.text(sessionUrl(c.url!)),
                        c.url!,
                        raw.tenderId!,
                      );
                      Object.assign(c, detail);
                      if (
                        detail.revisedClosingDate &&
                        (!enriched.extendedClosingDate ||
                          Date.parse(detail.revisedClosingDate) >
                            Date.parse(enriched.extendedClosingDate))
                      )
                        enriched.extendedClosingDate =
                          detail.revisedClosingDate;
                    } catch (e) {
                      partial = true;
                      corrFailure = true;
                      notes.push(
                        `Corrigendum verification failed for ${raw.tenderId}: ${sanitizeError(e)}`,
                      );
                    }
                  }
                  if (corrFailure)
                    enriched = {
                      ...enriched,
                      verification: "listing",
                      notes: [
                        ...(enriched.notes || []),
                        "Corrigendum verification incomplete; active status remains likely.",
                      ],
                    };
                  records[index] = enriched;
                } catch (e) {
                  partial = true;
                  notes.push(
                    `Detail verification failed for ${raw.tenderId}: ${sanitizeError(e)}`,
                  );
                }
              }
            },
          ),
        );
        notes.push(
          `Read ${links.length} matching official organisation chains without login or CAPTCHA bypass.`,
        );
        return result(partial ? "PARTIAL" : "SUCCESS");
      } catch (e) {
        return result(
          records.length ? "PARTIAL" : "UNAVAILABLE",
          sanitizeError(e),
        );
      }
    },
  };
}
