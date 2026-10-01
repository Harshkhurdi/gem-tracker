import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseBilaspur,
  createBilaspurAdapter,
} from "../src/lib/sources/adapters/bilaspur";
import { SourceHttp } from "../src/lib/sources/http";
const url = "https://www.aiimsbilaspur.edu.in/procurement/tender/gem";
const at = "2026-09-30T12:00:00Z";
function row(
  ref: string,
  title: string,
  start: string,
  end: string,
  extend = "-",
  docs = '<a href="/sites/default/files/bid.pdf">Bid</a>',
) {
  return `<tr>${["1", ref, title, "-", start, end, extend, docs, ""].map((x) => `<td>${x}</td>`).join("")}</tr>`;
}
const html = (rows: string) =>
  `<table id="procurementTable"><tbody>${rows}</tbody></table>`;
describe("AIIMS Bilaspur official listing parser", () => {
  it("retains dates, equipment identifiers and official documents without medical filtering", () => {
    const [r] = parseBilaspur(
      html(
        row(
          "CP-1956",
          "Laparocator with camera GEM/2026/B/8047970",
          "24-09-2026",
          "08-10-2026",
        ),
      ),
      url,
      "gem",
      at,
    );
    expect(r.tenderId).toBe("GEM/2026/B/8047970");
    expect(r.originalClosingDate).toBe("2026-10-08T23:59:59+05:30");
    expect(r.publishDate).toBe("2026-09-24T00:00:00+05:30");
    expect(r.datePrecision).toBe("day");
    expect(r.documents?.[0].url).toBe(
      "https://www.aiimsbilaspur.edu.in/sites/default/files/bid.pdf",
    );
    expect(r.verification).toBe("listing");
  });
  it("uses extension independently of old publication and retains nonmedical procurement", () => {
    const [r] = parseBilaspur(
      html(
        row(
          "ref",
          "Office furniture",
          "16-12-2025",
          "01-08-2026",
          "14-10-2026",
        ),
      ),
      url,
      "gem",
      at,
    );
    expect(r.extendedClosingDate).toBe("2026-10-14T23:59:59+05:30");
    expect(r.title).toBe("Office furniture");
  });
  it("keeps corrigendum publication metadata and does not assume it extends the deadline", () => {
    const docs =
      '<a href="/bid.pdf">Bid</a><ol><li><a href="/cor.pdf">Corrigendum 2. Bid Submission Date Extension.</a><div class="sizeOfFormat">Published Date : 04-08-2026</div></li></ol><a href="https://example.com/x.pdf">Other</a>';
    const [r] = parseBilaspur(
      html(row("r", "Equipment", "10-07-2026", "06-08-2026", "-", docs)),
      url,
      "cppp",
      at,
    );
    expect(r.corrigenda?.[0]).toMatchObject({
      type: "extension",
      publishedDate: "2026-08-04T00:00:00+05:30",
    });
    expect(r.extendedClosingDate).toBeUndefined();
    expect(r.documents).toHaveLength(2);
    expect(r.notes?.join(" ")).toContain("requires review");
  });
  it("retains erroneous dates as unknown rather than fabricating a deadline", () => {
    const records = parseBilaspur(
      html(
        row("a", "Wrong date", "30-04-2026", "14-04-2026") +
          row("b", "Impossible date", "01-09-2026", "31-09-2026"),
      ),
      url,
      "niq",
      at,
    );
    expect(records).toHaveLength(2);
    expect(records.every((r) => !r.originalClosingDate)).toBe(true);
    expect(records.every((r) => r.notes?.length)).toBe(true);
  });
  it("does not merge reissued tenders with a reused reference", () => {
    expect(
      parseBilaspur(
        html(
          row("same", "PICC", "27-07-2026", "17-08-2026") +
            row("same", "PICC", "25-09-2026", "20-10-2026"),
        ),
        url,
        "niq",
        at,
      ),
    ).toHaveLength(2);
  });
});

describe("AIIMS Bilaspur source structure health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  const changedRow =
    "<tr><td>1</td><td>Equipment tender</td><td>01-10-2026</td><td>Bid document</td></tr>";
  it("keeps a populated unrecognised listing unavailable for last-good retention", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(changedRow));
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
    expect(result.error).toContain("structure changed");
  });
  it("marks mixed readable and changed rows partial while retaining parsed records", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        row("r", "Office furniture", "01-09-2026", "10-10-2026") + changedRow,
      ),
    );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(1);
    expect(result.notes.join(" ")).toContain("structure changed");
  });
  it.each(["", '<tr><td colspan="9">No data available in table</td></tr>'])(
    "allows a genuine empty procurement table (%s)",
    async (rows) => {
      vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(rows));
      const result = await createBilaspurAdapter("gem").fetch();
      expect(result.status).toBe("SUCCESS");
      expect(result.records).toHaveLength(0);
      expect(result.successfulAt).toBeDefined();
    },
  );
  it("marks a later changed page partial rather than dropping earlier records", async () => {
    vi.spyOn(SourceHttp.prototype, "text")
      .mockResolvedValueOnce(
        html(row("r", "Office furniture", "01-09-2026", "10-10-2026")) +
          '<a href="?page=1">Next</a>',
      )
      .mockResolvedValueOnce(html(changedRow));
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.records).toHaveLength(1);
    expect(result.error).toContain("structure changed");
  });
  it("keeps an incomplete empty paginated listing unavailable", async () => {
    vi.spyOn(SourceHttp.prototype, "text")
      .mockResolvedValueOnce(html("") + '<a href="?page=1">Next</a>')
      .mockResolvedValueOnce(html(changedRow));
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.successfulAt).toBeUndefined();
  });
  it("reports the document cap without expanding upstream checks", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        Array.from({ length: 4 }, (_, i) =>
          row(String(i), "Surgical instruments", "01-01-2099", "10-10-2099"),
        ).join(""),
      ),
    );
    const documents = vi
      .spyOn(SourceHttp.prototype, "documentText")
      .mockResolvedValue("");
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.status).toBe("PARTIAL");
    expect(result.notes.join(" ")).toContain(
      "1 relevant document checks deferred",
    );
    expect(documents).toHaveBeenCalledTimes(3);
  });
  it("checks documents through the final millisecond of an IST closing day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T23:59:59.999+05:30"));
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(row("r", "Surgical instruments", "01-09-2026", "01-10-2026")),
    );
    const documents = vi
      .spyOn(SourceHttp.prototype, "documentText")
      .mockResolvedValue("");
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.metrics.detailChecks).toBe(1);
    expect(documents).toHaveBeenCalledTimes(1);
  });
});
