import { load } from "cheerio";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";
import { SourceHttp, officialUrl } from "../http";
import { runAdapter } from "../result";
import { parseIndianDate, dayOnly } from "@/lib/tender/dates";
import { classifyMedical } from "@/lib/tender/classifier";
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
      if (id)
        docs.push({
          label: "Resolve official PDF",
          url: "/api/documents/bfuhs/" + id,
        });
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
      referenceNumber: key === "bfuhs" ? id : undefined,
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
        const http = new SourceHttp();
        const records = parseInstitution(
          await http.text(config.url),
          key,
          new Date().toISOString(),
        );
        if (key === "bfuhs") {
          const candidates = records
            .filter((r) => classifyMedical(r.title).isMedical)
            .slice(0, 6);
          let failures = 0;
          await Promise.all(
            candidates.map(async (r) => {
              try {
                const id = r.referenceNumber;
                if (!id) return;
                const html = await http.text(config.url);
                const $ = load(html);
                const row = $("tr")
                  .filter(
                    (_, row) =>
                      $(row).children("td").first().text().trim() === id,
                  )
                  .first();
                const href = row.find("a").attr("href") || "";
                const event = href.match(/__doPostBack\('([^']+)'/)?.[1];
                if (!event) return;
                const form = new URLSearchParams();
                $("input[type=hidden]").each((_, input) => {
                  const name = $(input).attr("name");
                  if (name) form.set(name, $(input).attr("value") || "");
                });
                form.set("__EVENTTARGET", event);
                form.set("__EVENTARGUMENT", "");
                const response = await http.text(config.url, {
                  method: "POST",
                  body: form,
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                });
                const opened = response.match(
                  /window\.open\(['"]([^'"]+)['"]/i,
                )?.[1];
                const url = opened && officialUrl(opened, config.url);
                if (url) {
                  r.documents = [{ label: "Official PDF", url }];
                  const text = await http.documentText(url);
                  if (text) {
                    r.description = text.slice(0, 12000);
                    r.notes?.push(
                      "PDF text inspected; scanned documents may not expose a closing date.",
                    );
                  }
                }
              } catch {
                failures++;
              }
            }),
          );
          return {
            records,
            partial: true,
            notes: [
              `University-wide procurement; ${candidates.length} recent relevant PDFs inspected where accessible (${failures} unavailable). Unverified consignees remain statewide; unknown deadlines are never inferred.`,
            ],
          };
        }
        return {
          records,
          notes: [
            "Official institutional mirror; separate portal amendments may change the published deadline.",
          ],
          partial: key !== "aiims-bathinda",
        };
      }),
  };
  return adapter;
}
