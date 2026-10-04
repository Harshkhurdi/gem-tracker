import { describe, expect, it } from "vitest";
import { extractSpecifications } from "../src/lib/specification/extract";
import { fetchDocument, parseXlsx } from "../src/lib/specification/documents";
import { inspectPriorityTender } from "../src/lib/specification/enrich";
import type { ParsedDocument } from "../src/types/specification";
import type { RawTender } from "../src/types/tender";
import type { SourceHttp } from "../src/lib/sources/http";
import Excel from "exceljs";

const document = (text: string): ParsedDocument => ({
  label: "Technical specification", url: "https://gem.gov.in/context.pdf",
  type: "technical-specification", status: "parsed", pages: [{ page: 3, text }], productText: text,
});

describe("device context for shared specification terms", () => {
  it("preserves ventilator flow and occlusion excerpts without inventing infusion requirements", () => {
    const clauses = ["Inspiratory flow rate, L/min shall be 0 to 180", "Occlusion pressure Yes"];
    const result = extractSpecifications([document(`Technical specifications\n${clauses.join("\n")}`)], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements).toEqual([
      expect.objectContaining({ field: "Ventilation parameters", requirement: clauses[0], sourcePage: 3 }),
      expect.objectContaining({ field: "Flow and pressure", requirement: clauses[1], sourcePage: 3 }),
    ]);
  });
  it("prefers explicit respiratory flow over a mixed package's pump category", () => {
    const clause = "Inspiratory flow rate shall be 180 L/min";
    const result = extractSpecifications([document(clause)], ["VENTILATORS", "INFUSION_PUMPS"]);
    expect(result.sections.technicalRequirements).toEqual([expect.objectContaining({ field: "Ventilation parameters", requirement: clause })]);
  });
  it("retains shared terms as infusion requirements for an actual pump", () => {
    const result = extractSpecifications([document("Flow rate shall be 0.1 to 1200 ml/h\nOcclusion pressure shall be adjustable")], ["INFUSION_PUMPS"]);
    expect(result.sections.technicalRequirements.map((i) => i.field)).toEqual(["Infusion and syringe delivery", "Infusion and syringe delivery"]);
  });
  it("retains explicitly named infusion requirements in a mixed equipment package", () => {
    const clause = "Infusion flow rate shall be 0.1 to 1200 ml/h";
    expect(extractSpecifications([document(clause)], ["VENTILATORS"]).sections.technicalRequirements[0]).toMatchObject({ field: "Infusion and syringe delivery", requirement: clause });
  });
  it("uses the same context when replacing a dated amended respiratory clause", () => {
    const amendment = { ...document("Inspiratory flow rate amended: read as 200 L/min"), url: "https://gem.gov.in/amendment.pdf", type: "corrigendum" as const, publishedDate: "2026-10-03" };
    const result = extractSpecifications([document("Inspiratory flow rate shall be 180 L/min"), amendment], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements).toHaveLength(1);
    expect(result.sections.technicalRequirements[0].field).toBe("Ventilation parameters");
    expect(result.supersededRequirements).toHaveLength(1);
  });
});

describe("current GeM keyword deadline precedence", () => {
  it("keeps the current search-index deadline when a linked amendment has an older deadline", async () => {
    const workbook = new Excel.Workbook(), sheet = workbook.addWorksheet("Amendment");
    sheet.addRow(["Closing Date: 06-Oct-2026 15:00"]);
    sheet.addRow(["Battery runtime amended: read as 120 minutes"]);
    const bytes = await workbook.xlsx.writeBuffer();
    const raw: RawTender = {
      title: "ICU ventilator", tenderId: "GEM/2026/B/1234567", region: "Punjab",
      sourceId: "gem-priority-keywords", sourceName: "GeM priority", sourceUrl: "https://bidplus.gem.gov.in/all-bids",
      extendedClosingDate: "2026-10-15T17:00:00+05:30", datePrecision: "minute", verification: "listing", fetchedAt: "2026-10-04T10:00:00Z",
      corrigenda: [{ title: "Official amendment", url: "https://gem.gov.in/context-amendment.xlsx", publishedDate: "2026-10-01" }],
    };
    const http = { fetch: async () => new Response(bytes as unknown as BodyInit, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }) } as unknown as SourceHttp;
    await inspectPriorityTender(raw, http);
    expect(raw.specification?.documentSources[0].status).toBe("parsed");
    expect(raw.extendedClosingDate).toBe("2026-10-15T17:00:00+05:30");
  });
});


describe("bounded workbook coverage transparency", () => {
  it("rejects a thirteenth sheet instead of silently claiming a complete inspection", async () => {
    const workbook = new Excel.Workbook();
    for (let i = 1; i <= 13; i++) {
      const sheet = workbook.addWorksheet(`Sheet ${i}`);
      sheet.addRow([i === 13 ? "Mandatory infusion pump specification" : "Technical specifications"]);
    }
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    await expect(parseXlsx(bytes)).rejects.toThrow("12-sheet inspection limit");
    const http = { fetch: async () => new Response(bytes as unknown as BodyInit, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }) } as unknown as SourceHttp;
    const unavailable = await fetchDocument(http, { label: "BOQ", url: "https://gem.gov.in/oversized-sheets.xlsx", type: "boq", status: "deferred" });
    expect(unavailable.status).toBe("unavailable");
    expect(unavailable.note).toContain("12-sheet inspection limit");
    expect(extractSpecifications([unavailable], ["INFUSION_PUMPS"]).extractionStatus).toBe("document-unavailable");
  });
});
