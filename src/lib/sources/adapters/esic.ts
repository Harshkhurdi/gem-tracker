import { load } from "cheerio";
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
