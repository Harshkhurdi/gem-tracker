import { describe, expect, it } from "vitest";
import { discoveryCategories, genericPriorityCandidate, priorityCategories, PRIORITY_EQUIPMENT } from "../src/lib/config/priority-equipment";
import type { RawTender } from "../src/types/tender";

const raw = (title: string): RawTender => ({ title, fetchedAt: "2026-10-02T08:00:00Z", region: "Punjab", sourceId: "test", sourceName: "Official test listing", sourceUrl: "https://example.org/tenders" });

const equipment = [
  ["Digital mammography system", "MAMMOGRAPHY"],
  ["Digital mamography system", "MAMMOGRAPHY"],
  ["Breast tomosynthesis system", "MAMMOGRAPHY"],
  ["Digital radiography system", "DIGITAL_RADIOGRAPHY"],
  ["Digital X-ray machine", "DIGITAL_RADIOGRAPHY"],
  ["Mobile DR", "DIGITAL_RADIOGRAPHY"],
  ["Portable DR unit", "DIGITAL_RADIOGRAPHY"],
  ["Mobile C-arm machine", "C_ARM"],
  ["Portable ventilator", "VENTILATORS"],
  ["Neonatal ventilator", "VENTILATORS"],
  ["ICU ventilator", "VENTILATORS"],
  ["Mechanical ventilator", "VENTILATORS"],
  ["Defibrillator", "DEFIBRILLATORS"],
  ["Automated external defibrillator", "DEFIBRILLATORS"],
  ["AED for cardiac resuscitation", "DEFIBRILLATORS"],
  ["Syringe pump", "INFUSION_PUMPS"],
  ["Syringe infusion pump", "INFUSION_PUMPS"],
  ["Infusion pump", "INFUSION_PUMPS"],
  ["Multiparameter monitor", "PATIENT_MONITORS"],
  ["Multi Parameter Monitor", "PATIENT_MONITORS"],
  ["Patient warming system", "PATIENT_WARMING"],
  ["Forced-air warming system", "PATIENT_WARMING"],
  ["Fluid warmer", "PATIENT_WARMING"],
  ["Blood and fluid warmer", "PATIENT_WARMING"],
  ["Video laryngoscope", "ENDOSCOPY"],
  ["Video-laryngoscope", "ENDOSCOPY"],
  ["Flexible intubation bronchoscope", "ENDOSCOPY"],
  ["OT light", "OT_LIGHTS"],
  ["Operating theatre lights", "OT_LIGHTS"],
  ["Ultrasound", "ULTRASOUND"],
  ["Colour Doppler", "ULTRASOUND"],
  ["Portable Doppler", "ULTRASOUND"],
  ["Anaesthesia machine", "ANAESTHESIA"],
  ["Anesthesia workstation", "ANAESTHESIA"],
  ["Hospital bed", "HOSPITAL_BEDS"],
  ["Endoscopy system", "ENDOSCOPY"],
] as const;

describe("complete equipment priority coverage", () => {
  it.each([
    "Quotation for purchase of OT Light UPS Battery",
    "Quotations for Purchase OT Light UPS Battery",
    "Quotation for Purchase of UPS backup for OT Light and Other Equipment",
  ])("retains accessory-only %s outside the OT-light system priority", title => {
    expect(priorityCategories(raw(title))).not.toContain("OT_LIGHTS");
    expect(discoveryCategories(title)).not.toContain("OT_LIGHTS");
  });
  it.each(["Supply of OT Lights with UPS and battery backup", "Quotation for Purchase of Dome OT Light"])("retains actual lighting procurement %s", title => {
    expect(priorityCategories(raw(title))).toContain("OT_LIGHTS");
  });
  it.each(equipment)("discovers and assigns %s", (title, group) => {
    expect(priorityCategories(raw(title))).toContain(group);
    expect(discoveryCategories(title)).toContain(group);
  });
  it("preserves the original five groups and exposes every added group", () => {
    expect(PRIORITY_EQUIPMENT.map(p => p.id)).toEqual(expect.arrayContaining([
      "VENTILATORS", "ULTRASOUND", "DEFIBRILLATORS", "HOSPITAL_BEDS", "ENDOSCOPY",
      "MAMMOGRAPHY", "DIGITAL_RADIOGRAPHY", "C_ARM", "INFUSION_PUMPS", "PATIENT_MONITORS", "PATIENT_WARMING", "OT_LIGHTS", "ANAESTHESIA",
    ]));
  });
  it.each([
    "Industrial water pump", "Submersible pump", "HVAC ventilator", "Industrial exhaust ventilator", "Ventilator for HVAC", "Building ventilation system",
    "Room heater and industrial warmer", "Office lights", "Surveillance video monitoring", "Computer monitors", "Fetal Doppler", "Foetal Doppler",
    "Ultrasound gel", "Ultrasound UPS batteries", "Ultrasound simulator", "Road construction", "Renovation of radiography room", "AED", "AED currency exchange",
    "MRI system", "Fetal monitor", "Enteral feeding pump", "Doppler radar", "Weather Doppler", "Industrial fluid warmer", "Fluid warmer for industrial process", "Mamography",
  ])("does not invent a priority system for %s", title => {
    expect(priorityCategories(raw(title))).toEqual([]);
    expect(discoveryCategories(title)).toEqual([]);
  });
  it.each(equipment)("requires declared document evidence to promote generic equipment to %s", (product, group) => {
    const generic = { ...raw("Medical Equipment Package"), description: `Buyer inventory includes ${product}` };
    expect(genericPriorityCandidate(generic)).toBe(true);
    expect(priorityCategories(generic)).toEqual([]);
    expect(priorityCategories({ ...generic, documentProductScope: `Technical Specifications\n${product}` })).toContain(group);
  });
  it("ignores discovery keywords after actual document scope", () => {
    expect(priorityCategories({ ...raw("Medical Equipment Package"), documentProductScope: "Bid Details\nItem Category\nOffice chairs\nGeMARPTS\nSearched strings\nDigital mammography and portable ventilator" })).toEqual([]);
  });
});


describe("imaging compatibility is not purchased equipment", () => {
  it("keeps an operating table medical without inventing C-arm or DR purchases", () => {
    const tender = {
      ...raw("Operating Table (V2)"),
      documentProductScope: "Technical Specifications\nOperating Table\nC-Arm Compatible Yes\nProvision of X ray cassette channel\nTable top X-ray compatible",
    };
    expect(priorityCategories(tender)).toEqual([]);
  });
  it.each([
    "C-Arm compatible: Yes",
    "Compatible with digital radiography systems",
    "Flat panel detector compatibility: Yes",
    "For use with ultrasound systems",
    "Suitable for use with mammography system",
  ])("does not promote table requirement %s", requirement => {
    expect(priorityCategories({ ...raw("Operating Table"), documentProductScope: `Technical Specifications\nOperating Table\n${requirement}` })).toEqual([]);
  });
  it.each([
    ["Mobile DR with DICOM compatibility", "DIGITAL_RADIOGRAPHY"],
    ["Digital mammography machine compatible with DICOM", "MAMMOGRAPHY"],
    ["C-arm machine DICOM compatible", "C_ARM"],
    ["Operating table and C-arm machine with DICOM compatibility", "C_ARM"],
  ])("retains actual imaging item with compatibility requirements: %s", (product, group) => {
    expect(priorityCategories({ ...raw("Medical Equipment Package"), documentProductScope: `Technical Specifications\n${product}` })).toContain(group);
  });
  it("retains a genuinely bundled operating table and C-arm machine", () => {
    expect(priorityCategories({ ...raw("Operating Table and C-arm machine"), documentProductScope: "Technical Specifications\nOperating Table and C-arm machine\nC-arm compatible table" })).toEqual(["C_ARM"]);
  });
  it("promotes a generic package when its declared item is a C-arm", () => {
    expect(priorityCategories({ ...raw("Medical Equipment Package"), documentProductScope: "Item Category\nC-arm machine\nTechnical Specifications\nTable compatibility required" })).toEqual(["C_ARM"]);
  });
  it("preserves the actual device group when an imaging compatibility clause shares its item line", () => {
    expect(priorityCategories({ ...raw("Hospital beds"), documentProductScope: "Technical Specifications\nHospital beds compatible with C-arm machine" })).toEqual(["HOSPITAL_BEDS"]);
  });
});


describe("laparoscopic use cases are not supplied endoscopy equipment", () => {
  it("does not promote electrocautery used in laparoscopic cases", () => {
    expect(priorityCategories({ ...raw("Electrocautery Machine (V2)"), documentProductScope: "Technical Specifications\nElectrocautery Machine\nFor delicate tissue or Laparoscopic cases having at\nor Laparoscopic cases having at least power of 40" })).toEqual([]);
  });
  it.each(["Laparoscopic cases", "For laparoscopic procedures", "Laparoscopy procedures"])("requires equipment beyond generic use context %s", context => {
    expect(priorityCategories({ ...raw("Medical Equipment Package"), documentProductScope: `Technical Specifications\n${context}` })).toEqual([]);
  });
  it.each([
    "Laparoscopic instruments",
    "Laparoscopy equipment",
    "Radiofrequency coagulation equipment with Hand Instruments for Open/Laparoscopic Surgery",
    "Electrocautery for laparoscopic procedures and laparoscopic instruments",
  ])("retains actual or bundled instrument procurement %s", product => {
    expect(priorityCategories({ ...raw("Medical Equipment Package"), documentProductScope: `Item description\n${product}` })).toContain("ENDOSCOPY");
  });
  it("preserves explicitly titled laparoscopy equipment when document text gives its use", () => {
    expect(priorityCategories({ ...raw("Laparoscopy equipment"), documentProductScope: "Technical Specifications\nFor laparoscopic procedures" })).toContain("ENDOSCOPY");
  });
});
