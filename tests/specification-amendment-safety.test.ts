import { describe, expect, it } from "vitest";
import type { ParsedDocument } from "../src/types/specification";
import { extractSpecifications } from "../src/lib/specification/extract";

function document(text: string, extra: Partial<ParsedDocument> = {}): ParsedDocument {
  return { label: "Official technical specification", url: "https://www.aiimsbathinda.edu.in/spec.pdf",
    type: "technical-specification", status: "parsed", pages: [{ page: 1, text }], productText: text, ...extra };
}
const amendment = (text: string, url: string, publishedDate?: string) => document(text, { url, type: "corrigendum", publishedDate });

describe("clause-level official amendment safety", () => {
  it("does not supersede a sole unrelated clause in the same display group", () => {
    const result = extractSpecifications([
      document("Technical Specifications\nBattery runtime shall be 2 hours"),
      amendment("Battery charge time amended: read as 90 minutes", "https://www.aiimsbathinda.edu.in/c1.pdf", "2026-10-01"),
    ], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements).toHaveLength(2);
    expect(result.supersededRequirements).toEqual([]);
    expect(result.extractionStatus).toBe("partial");
  });
  it("replaces the named clause while keeping unrelated clauses in the group", () => {
    const result = extractSpecifications([
      document("Technical Specifications\nBattery runtime 2 hours\nBattery charge time 60 minutes"),
      amendment("Battery runtime amended: read as 90 minutes", "https://www.aiimsbathinda.edu.in/c1.pdf", "2026-10-01"),
    ], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements.map((item) => item.requirement)).toEqual([
      "Battery charge time 60 minutes", "Battery runtime amended: read as 90 minutes",
    ]);
    expect(result.supersededRequirements.map((item) => item.requirement)).toEqual(["Battery runtime 2 hours"]);
    expect(result.extractionStatus).toBe("complete");
  });
  it.each([undefined, "invalid", "2026-10-01"])("preserves the original and competing amendments with uncertain chronology %s", (publishedDate) => {
    const original = document("Technical Specifications\nBattery runtime 2 hours");
    const first = amendment("Battery runtime amended: read as 90 minutes", "https://www.aiimsbathinda.edu.in/c1.pdf", "2026-10-01");
    const second = amendment("Battery runtime amended: read as 60 minutes", "https://www.aiimsbathinda.edu.in/c2.pdf", publishedDate);
    for (const documents of [[original, first, second], [second, original, first]]) {
      const result = extractSpecifications(documents, ["VENTILATORS"]);
      expect(result.sections.technicalRequirements).toHaveLength(3);
      expect(result.supersededRequirements).toEqual([]);
      expect(result.extractionStatus).toBe("partial");
      expect(result.notes.join()).toContain("precedence requires official review");
    }
  });
  it("preserves competing wrapped amendments with the same publication date", () => {
    const result = extractSpecifications([
      document("Technical Specifications\nBattery runtime 2 hours"),
      amendment("Battery runtime:\namended read as 90 minutes", "https://www.aiimsbathinda.edu.in/c1.pdf", "2026-10-01"),
      amendment("Battery runtime:\namended read as 60 minutes", "https://www.aiimsbathinda.edu.in/c2.pdf", "2026-10-01"),
    ], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements).toHaveLength(3);
    expect(result.supersededRequirements).toEqual([]);
    expect(result.extractionStatus).toBe("partial");
  });
  it("preserves contradictory clauses within a single amendment document", () => {
    const result = extractSpecifications([
      document("Technical Specifications\nBattery runtime 2 hours"),
      amendment("Battery runtime amended: read as 90 minutes\nBattery runtime amended: read as 60 minutes", "https://www.aiimsbathinda.edu.in/c1.pdf", "2026-10-01"),
    ], ["VENTILATORS"]);
    expect(result.sections.technicalRequirements).toHaveLength(3);
    expect(result.supersededRequirements).toEqual([]);
    expect(result.extractionStatus).toBe("partial");
  });

});
