import { describe, expect, it } from "vitest";
import { extractSpecifications } from "../src/lib/specification/extract";
import type { ParsedDocument, PriorityEquipment } from "../src/types/specification";

describe("expanded priority equipment specification evidence", () => {
  const cases: [PriorityEquipment, string, string][] = [
    ["MAMMOGRAPHY", "Radiography and mammography", "Compression force shall be adjustable from 20 to 200 N"],
    ["DIGITAL_RADIOGRAPHY", "Radiography and mammography", "Pixel pitch shall be at most 150 microns"],
    ["C_ARM", "C-arm and mobile imaging", "Orbital rotation shall be at least 120 degrees"],
    ["INFUSION_PUMPS", "Infusion and syringe delivery", "Infusion accuracy shall be within 2 percent"],
    ["PATIENT_MONITORS", "Monitoring", "SpO2, NIBP and EtCO2 are required"],
    ["PATIENT_WARMING", "Patient and fluid warming", "Fluid warmer temperature range shall be 35 to 42 degrees C"],
    ["OT_LIGHTS", "Surgical illumination", "Illuminance shall be adjustable up to 160000 lux"],
    ["ANAESTHESIA", "Anaesthesia delivery", "Fresh gas flow shall be adjustable from 0.2 to 15 L/min"],
    ["ENDOSCOPY", "Airway visualization", "Intubation bronchoscope working channel shall be at least 2 mm"],
  ];
  it.each(cases)("retains %s requirements with exact official provenance", (category, field, requirement) => {
    const doc: ParsedDocument = {
      label: "Official specification",
      url: "https://www.aiimsbathinda.edu.in/specification.pdf",
      type: "technical-specification",
      status: "parsed",
      pages: [{ page: 7, text: `Technical specifications\n${requirement}` }],
      productText: requirement,
    };
    const result = extractSpecifications([doc], [category]);
    expect(result.sections.technicalRequirements).toContainEqual(expect.objectContaining({
      field, requirement, mandatory: true, sourceDocument: doc.url, sourcePage: 7,
    }));
    expect(result.equipmentTypes).toEqual([category]);
    expect(result.extractionStatus).toBe("complete");
  });

  it("cannot invent expanded requirements from an inaccessible attachment", () => {
    const doc: ParsedDocument = {
      label: "Official pump specification",
      url: "https://www.aiimsbathinda.edu.in/specification.pdf",
      type: "technical-specification",
      status: "unavailable",
      pages: [],
      productText: "",
    };
    const result = extractSpecifications([doc], ["INFUSION_PUMPS"]);
    expect(result.sections.technicalRequirements).toEqual([]);
    expect(result.extractionStatus).toBe("document-unavailable");
  });
});
