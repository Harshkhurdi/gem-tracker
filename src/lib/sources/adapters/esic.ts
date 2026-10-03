import { load } from "cheerio";
import { createNicAdapter } from "./nic";
import { SourceHttp, officialUrl } from "../http";
import { runAdapter } from "../result";
import { parseIndianDate } from "@/lib/tender/dates";
import type { RawTender, TenderSourceAdapter } from "@/types/tender";
export const esicAdapter: TenderSourceAdapter = {
  id: "esic",
  name: "ESIC public office notices",
  url: "https://esic.gov.in/tenders",
  institutionIds: ["esic-ludhiana"],
  regions: ["Punjab"],
  fetch: () =>
    runAdapter(esicAdapter, async () => {
      const http = new SourceHttp();
      const records: RawTender[] = [];
      let pages = 0;
      const notes: string[] = [];
      for (let page = 1; page <= 6; page++) {
        try {
          const url =
            page === 1
              ? esicAdapter.url
              : `https://esic.gov.in/tenders/index/page:${page}`;
          const $ = load(await http.text(url));
          let recognized = 0;
          $("tr").each((_, row) => {
            const c = $(row).children("td");
            if (c.length !== 6) return;
            const published = parseIndianDate(c.eq(3).text());
            if (!published) return;
            recognized++;
            const office = c.eq(1).text().trim();
            if (!/Ludhiana/i.test(office)) return;
            const title = c.eq(2).text().trim(),
              deadline = parseIndianDate(c.eq(4).text(), true);
            const documents = c
              .eq(2)
              .find("a[href]")
              .toArray()
              .flatMap((a) => {
                const href = officialUrl($(a).attr("href") || "", url);
                return href
                  ? [
                      {
                        label: $(a).text().trim() || "Official ESIC document",
                        url: href,
                      },
                    ]
                  : [];
              });
            records.push({
              title,
              region: "Punjab",
              sourceId: esicAdapter.id,
              sourceName: esicAdapter.name,
              sourceUrl: url,
              tenderUrl: documents[0]?.url || url,
              tenderId: title.match(/GEM\/\d{4}\/B\/\d+/i)?.[0],
              referenceNumber: c.eq(5).text().trim(),
              organisation: office,
              organisationChain: [office],
              institutionId: "esic-ludhiana",
              procurementScope: "institution",
              publishDate: published,
              originalClosingDate: deadline,
              datePrecision: "day",
              documents,
              verification: "listing",
              fetchedAt: new Date().toISOString(),
            });
          });
          if (!recognized) throw Error("ESIC notice table unavailable");
          pages++;
        } catch {
          if (!pages) throw Error("ESIC notice source unavailable");
          notes.push(
            "A later page could not be read; earlier checked records are retained.",
          );
          break;
        }
      }
      return {
        records,
        partial: true,
        notes: [
          ...notes,
          `Scanned ${pages} latest ESIC pages for Ludhiana. Older pages and GeM-only notices may be missing; zero matches is not complete archive coverage.`,
        ],
      };
    }),
};

// ESIC's own office-notice site can be unavailable while its public CPPP
// organisation listing remains readable. Keep both sources visible: CPPP
// ordinary tenders cannot establish coverage of GeM-only office notices.
const esicCppp = createNicAdapter({
  id: "cppp-esic",
  name: "CPPP / ESIC regional healthcare",
  origin: "https://eprocure.gov.in",
  prefix: "/eprocure/app",
  organisation: /^Employees State Insurance Corporation$/i,
  region: "Punjab",
  institutionIds: ["esic-ludhiana", "hp-esic-baddi"],
  regionalHealthcare: true, detailLimit: 64, budgetMs: 75000,
});
export const cpppEsicAdapter: TenderSourceAdapter = {
  ...esicCppp,
  async fetch() {
    const result = await esicCppp.fetch();
    return {
      ...result,
      notes: [
        ...result.notes,
        "Checks public CPPP ESIC organisation tenders for the six monitored regions with delivery-region evidence; GeM-only and ESIC office-notice coverage remain separate.",
      ],
    };
  },
};
