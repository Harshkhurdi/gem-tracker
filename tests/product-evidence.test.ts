import { describe, expect, it } from "vitest";
import { classifyMedical, matchBrands } from "../src/lib/tender/classifier";
import { productEvidence } from "../src/lib/tender/product-evidence";

const gem = (item: string, suggestions: string, technical = "") => `Bid Details
Total Quantity 1
Item Category ${item}
GeMARPTS Searched Strings
${item}
Searched Result generated in GeMARPTS
${suggestions}
Relevant Categories selected for notification
Surgical Forceps, ultrasound, patient monitor
Minimum Average Annual Turnover of the bidder 5 Lakh
Technical Specifications
${technical}
Consignees/Reporting Officer and Quantity
Buyer Added Bid Specific Terms and Conditions
Samsung Hamilton Karl Storz LINET Medcaptain Spacelabs Skanray
General Terms and Conditions
ventilator, hospital bed, infusion pump`;

describe("product evidence from GeM documents", () => {
  it.each([
    ["CRRT Machine", "Surgical Forceps", ["OTHER_MEDICAL_EQUIPMENT"]],
    ["MacroMedics BreastBoard SX", "Open / Endoscopic Clip Applicator", ["OTHER_MEDICAL_EQUIPMENT"]],
    ["Optical Colposcope", "Research Microscope", ["OTHER_MEDICAL_EQUIPMENT"]],
    ["Endoscopic Spine System", "Endoscopic Ultrasound", ["ENDOSCOPY"]],
  ])("uses actual %s, excluding discovery suggestion %s", (title, suggestion, categories) => {
    const text = gem(title as string, suggestion as string);
    const c = classifyMedical(text, title as string);
    expect(c.categories).toEqual(categories);
    expect(c.confidence).toBeCloseTo(0.76);
    expect(c.matchedKeywords.join(" ")).not.toMatch(/surgical forceps|ultrasound|microscope/);
    const brands = matchBrands(text, c.categories, title as string);
    expect(brands.map((b) => b.brand)).toEqual(title === "Endoscopic Spine System" ? ["KARL STORZ"] : []);
    expect(brands.every((b) => b.matchType === "portfolio")).toBe(true);
  });
  it.each([
    ["Patient monitor", ["Spacelabs Healthcare", "Skanray"]],
    ["ICU ventilator", ["Hamilton Medical", "Skanray"]],
    ["Infusion pump", ["Medcaptain", "Skanray"]],
    ["Digital Radiography machine", ["Samsung Healthcare", "Skanray"]],
  ])("retains genuine item evidence for %s", (title, brands) => {
    const text = gem(title, "Eclipse, Sprint, Sentinel, R20, Athena");
    expect(classifyMedical(text, title).isMedical).toBe(true);
    expect(matchBrands(text, undefined, title).map((b) => b.brand)).toEqual(brands);
    expect(matchBrands(text, undefined, title).every((b) => b.matchType === "portfolio")).toBe(true);
  });
  it("keeps true technical HAMILTON C6 brand and model evidence", () => {
    const title = "ICU ventilator";
    const text = gem(title, "Surgical Forceps", "Compatibility with HAMILTON C6 ventilator and H900 heated humidifier required.");
    expect(matchBrands(text, undefined, title)).toContainEqual(expect.objectContaining({brand:"Hamilton Medical",matchType:"explicit-brand"}));
    expect(productEvidence(text)).toContain("HAMILTON C6");
    expect(productEvidence(text)).not.toContain("Surgical Forceps");
  });
  it("retains inline bilingual technical specification evidence", () => {
    const text = "Bid Details\nItem Category ventilator\nGeMARPTS\nSamsung\nतकनीकी /Technical Specifications: HAMILTON C6 ventilator\nConsignees/Reporting Officer and Quantity\n";
    expect(matchBrands(text)).toContainEqual(expect.objectContaining({brand:"Hamilton Medical",matchType:"explicit-brand"}));
    expect(matchBrands(text)).not.toContainEqual(expect.objectContaining({brand:"Samsung Healthcare"}));
  });
  it("preserves true explicit model in technical specifications", () => {
    const text = gem("Digital Radiography", "Qube", "Replacement detector for GM85 Fit digital radiography system");
    expect(matchBrands(text)).toContainEqual(expect.objectContaining({brand:"Samsung Healthcare",matchType:"explicit-model"}));
  });
  it("does not promote boilerplate-only brands, models, keywords or supplied categories", () => {
    const text = gem("Stationery", "H900 C-MAC GC85 BodyTom R20 Eclipse Sentinel Sprint Athena");
    expect(classifyMedical(text).isMedical).toBe(false);
    expect(classifyMedical(text).matchedKeywords).toEqual([]);
    expect(classifyMedical(text).confidence).toBe(0);
    expect(matchBrands(text, ["VENTILATION", "XRAY_DR", "ENDOSCOPY"])).toEqual([]);
  });
  it("keeps title scope even when PDF segmentation fails", () => {
    const text = "GeMARPTS search suggestions\nSurgical Forceps H900 Samsung";
    expect(productEvidence(text)).toBe("");
    expect(classifyMedical(text, "CRRT Machine").categories).toEqual(["OTHER_MEDICAL_EQUIPMENT"]);
    expect(matchBrands(text, undefined, "CRRT Machine")).toEqual([]);
  });
  it("recognizes item values above bilingual labels without retaining preceding metadata", () => {
    const text = "Bid Details\nBuyer Email buyer@hospital.test\nTotal Quantity 1\nMacroMedics BreastBoard SX\nव तु\nण े ी /Item Category\naccessories on a PAC basis\nGeMARPTS\nEndoscopic Clip\n";
    expect(classifyMedical(text).categories).toEqual(["OTHER_MEDICAL_EQUIPMENT"]);
    expect(matchBrands(text)).toEqual([]);
  });
  it("drops standalone help/history and preserves a later product technical section", () => {
    const text = "Procurement notice\nHelp\nSamsung Hamilton Karl Storz LINET Medcaptain Spacelabs Skanray\nProcurement History\npatient monitor Eclipse\nTechnical Specifications\nInfusion pump required\nGeneral Terms and Conditions\nH900 C-MAC";
    expect(classifyMedical(text).categories).toEqual(["INFUSION"]);
    expect(matchBrands(text).map((b)=>b.brand)).toEqual(["Medcaptain", "Skanray"]);
    expect(matchBrands(text).every((b)=>b.matchType === "portfolio")).toBe(true);
  });
});
