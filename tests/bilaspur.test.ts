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
  it("reports the bounded document cap after checking all current relevant rows", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        Array.from({ length: 13 }, (_, i) =>
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
    expect(documents).toHaveBeenCalledTimes(12);
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

describe("Bilaspur deadline evidence reconciliation", () => {
  afterEach(() => vi.restoreAllMocks());
  it("removes contradictory listing dates from actionable deadlines while recovering exact PDF bid IDs", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(row("-", "Infusion pumps", "11-05-2026", "11-11-2026")),
    );
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(
      "Bid Number: GEM/2026/B/7410483 Bid End Date/Time 11-05-2026 17:00:00",
    );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].tenderId).toBe("GEM/2026/B/7410483");
    expect(result.records[0].originalClosingDate).toBeUndefined();
    expect(result.records[0].notes?.join(" ")).toContain("Deadline conflict");
    expect(result.status).toBe("PARTIAL");
  });
  it("rejects dates from a different attached bid", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        row(
          "GEM/2026/B/8047970",
          "Surgical instruments",
          "24-09-2026",
          "08-10-2026",
        ),
      ),
    );
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(
      "Bid Number: GEM/2026/B/9999999 Bid End Date/Time 12-10-2026 17:00:00",
    );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].originalClosingDate).toBe(
      "2026-10-08T23:59:59+05:30",
    );
    expect(result.records[0].notes?.join(" ")).toContain("identity differs");
  });
  it("retains an explicit newer listing extension when original PDF is old", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        row(
          "GEM/2026/B/7410483",
          "Infusion pumps",
          "20-04-2026",
          "11-05-2026",
          "11-11-2026",
        ),
      ),
    );
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(
      "Bid Number: GEM/2026/B/7410483 Bid End Date/Time 11-05-2026 17:00:00",
    );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].extendedClosingDate).toBe(
      "2026-11-11T23:59:59+05:30",
    );
    expect(result.records[0].datePrecision).toBe("day");
  });
  it("does not replace a current listed extension with an older attached extension", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(
      html(
        row(
          "GEM/2026/B/7410483",
          "Infusion pumps",
          "20-04-2026",
          "11-05-2026",
          "11-11-2026",
          '<a href="/old.pdf">Date Extension</a>',
        ),
      ),
    );
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(
      "Bid Number: GEM/2026/B/7410483 Revised Bid End Date/Time 11-06-2026 17:00:00",
    );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].extendedClosingDate).toBe(
      "2026-11-11T23:59:59+05:30",
    );
    expect(
      result.records[0].corrigenda?.[0].revisedClosingDate,
    ).toBeUndefined();
    expect(result.records[0].notes?.join(" ")).toContain(
      "listing extension retained",
    );
  });
  it("follows a third linked listing page rather than silently omitting its records", async () => {
    vi.spyOn(SourceHttp.prototype, "text")
      .mockResolvedValueOnce(
        html(row("a", "Office furniture", "01-09-2026", "10-10-2026")) +
          '<a href="?page=1">Next</a>',
      )
      .mockResolvedValueOnce(
        html(row("b", "Office furniture", "01-09-2026", "10-10-2026")) +
          '<a href="?page=2">Next</a>',
      )
      .mockResolvedValueOnce(
        html(row("c", "Office furniture", "01-09-2026", "10-10-2026")),
      );
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records).toHaveLength(3);
    expect(result.status).toBe("SUCCESS");
  });
});


describe("persisted reviewed Bilaspur conflicts", () => {
  afterEach(() => vi.restoreAllMocks());
  const evidenceDoc = '/sites/default/files/2026-05/GeM%20tender%20for%20the%20Procurement%20of%20Endoscopic%20Spine%20System%20for%20the%20Department%20of%20Orthopaedics%20GeM%20bid%20No.%20GEM-2026-B-7421096..pdf';
  it("withholds the exact reviewed contradictory listing even when PDF fetch fails", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(row("GEM/2026/B/7421096", "Endoscopic Spine System", "09-05-2026", "09-11-2026", "-", `<a href="${evidenceDoc}">Bid</a>`)));
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue(undefined);
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].originalClosingDate).toBeUndefined();
    expect(result.records[0].notes?.join(" ")).toContain("Reviewed deadline conflict");
  });
  it("lets an identity-matched linked corrigendum resolve the reviewed conflict to a different date", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(row("GEM/2026/B/7421096", "Endoscopic Spine System", "09-05-2026", "09-11-2026", "-", `<a href="${evidenceDoc}">Bid</a><a href="/sites/default/files/revised.pdf">Bid Submission Date Extension</a>`)));
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue("Bid Number GEM/2026/B/7421096 Revised Bid End Date/Time 20-10-2026 17:00:00");
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].extendedClosingDate).toBe("2026-10-20T17:00:00+05:30");
    expect(result.records[0].corrigenda?.[0].revisedClosingDate).toBe("2026-10-20T17:00:00+05:30");
  });
  it("keeps a reviewed conflict unresolved when an attached correction lacks bid identity", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(row("GEM/2026/B/7421096", "Endoscopic Spine System", "09-05-2026", "09-11-2026", "-", `<a href="${evidenceDoc}">Bid</a><a href="/sites/default/files/revised.pdf">Bid Submission Date Extension</a>`)));
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue("Revised Bid End Date/Time 09-11-2026 17:00:00");
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].originalClosingDate).toBeUndefined();
    expect(result.records[0].extendedClosingDate).toBeUndefined();
  });
  it("does not apply reviewed conflicts to changed listing revisions", () => {
    const [record] = parseBilaspur(html(row("GEM/2026/B/7421096", "Endoscopic Spine System", "09-05-2026", "10-11-2026", "-", `<a href="${evidenceDoc}">Bid</a>`)), url, "gem", at);
    expect(record.originalClosingDate).toBe("2026-11-10T23:59:59+05:30");
  });
  it("restores a current deadline only if the revised original PDF now confirms the reviewed listing date", async () => {
    vi.spyOn(SourceHttp.prototype, "text").mockResolvedValue(html(row("GEM/2026/B/7421096", "Endoscopic Spine System", "09-05-2026", "09-11-2026", "-", `<a href="${evidenceDoc}">Bid</a>`)));
    vi.spyOn(SourceHttp.prototype, "documentText").mockResolvedValue("Bid Number GEM/2026/B/7421096 Bid End Date/Time 09-11-2026 17:00:00");
    const result = await createBilaspurAdapter("gem").fetch();
    expect(result.records[0].originalClosingDate).toBe("2026-11-09T17:00:00+05:30");
  });
});
