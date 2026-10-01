import { describe, expect, it } from "vitest";
import { classifyMedical, matchBrands } from "../src/lib/tender/classifier";
import { buildDashboard, normalizeTender } from "../src/lib/tender/normalize";
import { enrichNicDetail } from "../src/lib/sources/adapters/nic";
import { deduplicate } from "../src/lib/tender/dedupe";
import type { RawTender, SourceFetchResult } from "../src/types/tender";

const now = new Date("2026-10-01T12:00:00Z");
const civil: RawTender = {
  tenderId: "2026_CHD_95906_1",
  title: "Variuos Need Based Repair Works required in the Department off Anesthesia, Block-D, GMCH, Sector 32, Chandigarh.",
  description: "Civil repair of plaster, flooring and doors in Anaesthesia Department",
  tenderCategory: "Works",
  productCategory: "Civil Works",
  department: "Anaesthesia",
  institutionId: "gmch",
  region: "Chandigarh",
  sourceId: "chandigarh-eproc",
  sourceName: "Chandigarh eProcurement",
  sourceUrl: "https://etenders.chd.nic.in/nicgep/app",
  originalClosingDate: "2026-10-09T14:00:00+05:30",
  verification: "detail",
  fetchedAt: now.toISOString(),
};

describe("civil/infrastructure context is not medical product evidence", () => {
  it("rejects the confirmed tender through classification and the real dashboard pipeline", () => {
    const classification = classifyMedical(civil.description!, civil.title, civil);
    expect(classification).toMatchObject({isMedical: false, categories: [], matchedKeywords: [], confidence: 0});
    expect(matchBrands(civil.description!, undefined, civil.title, civil)).toEqual([]);
    expect(normalizeTender(civil, false, now)).toBeUndefined();
    const medical = {...civil, tenderId: "device-repair", title: "Repair of Anaesthesia Workstation",
      description: "CMC of anaesthesia machine", tenderCategory: "Services", productCategory: "Medical Equipment"};
    const source: SourceFetchResult = {sourceId: civil.sourceId, sourceName: civil.sourceName,
      status: "SUCCESS", records: [civil, medical], attemptedAt: now.toISOString(), notes: [], durationMs: 1,
      metrics: {rawRecords: 2, institutionMatches: 0, medicalMatches: 0, falsePositivesRejected: 0, unassignedRejected: 0, detailChecks: 2}};
    const dashboard = buildDashboard([source], false, now);
    expect(dashboard.tenders.map(t => t.tenderId)).toEqual(["device-repair"]);
    expect(dashboard.summary.falsePositivesRejected).toBe(1);
    expect(dashboard.sources[0].metrics.medicalMatches).toBe(1);
  });

  it.each([
    civil.title,
    "Renovation of Anaesthesia Department",
    "Repair of flooring in ICU",
    "Painting of Radiology Department",
    "Civil repair in Endoscopy Room",
    "Electrical work in Operation Theatre",
    "False ceiling in Ultrasound Department",
    "Plumbing works in ICU ward",
    "Painting work in Anaesthesia Department",
    "Floor repair in Radiology Department",
    "Civil work in ICU",
    "Renovation of Endoscopy Room",
    "Electrical repair in Ultrasound Department",
    "False ceiling in Operation Theatre",
    "Waterproofing and masonry in X-ray room",
    "White washing of Endoscopy Room",
    "Roof repair of ICU ward",
    "Carpentry and door repair in Ultrasound Department",
    "Sanitary work and drainage in Endoscopy Room",
    "HVAC in ICU ward",
    "Fire fighting work in Anaesthesia Department",
    "Cabling and transformer work in Radiography Department",
    "Civil repair in ventilator room",
    "Quotation for 1.5 Tesla MRI Machine Room regarding installation of new 8.5 ton ductable AC Unit",
    "Painting of CT scanner room",
    "Civil work in ICU. The hospital owns patient monitors",
  ])("rejects infrastructure without relying on source metadata: %s", title => {
    expect(classifyMedical(title).isMedical).toBe(false);
    expect(matchBrands(title)).toEqual([]);
  });

  it.each([
    "Anaesthesia Department", "Department of Anaesthesia", "Department off Anesthesia",
    "Ultrasound Department", "Endoscopy Room", "X-ray room", "Patient monitoring ward",
    "Department: anaesthesia\nLocation: ultrasound department",
    "Buyer: Samsung Healthcare\nDepartment: anaesthesia\nOffice name: Hamilton ICU",
  ])("does not promote department or buyer context alone: %s", text => {
    expect(classifyMedical(text).categories).toEqual([]);
    expect(matchBrands(text)).toEqual([]);
  });

  it("does not assign explicit manufacturer matches to a rejected nonmedical record", () => {
    const text = "Painting of Anaesthesia Department; Samsung Hamilton Karl Storz LINET Medcaptain Spacelabs Skanray";
    expect(matchBrands(text)).toEqual([]);
    expect(matchBrands("Samsung stationery")).toEqual([]);
  });
});

describe("device repairs and installation retain their medical relevance and portfolios", () => {
  it.each([
    ["Repair of Anaesthesia Workstation", "ANAESTHESIA", "Medcaptain"],
    ["CMC of ICU Ventilators", "VENTILATION", "Hamilton Medical"],
    ["CAMC of Patient Monitors", "PATIENT_MONITORING", "Spacelabs Healthcare"],
    ["Repair of Ultrasound Machine", "ULTRASOUND", "Samsung Healthcare"],
    ["Maintenance of Digital Radiography System", "XRAY_DR", "Samsung Healthcare"],
    ["Repair of Endoscopy Camera System", "ENDOSCOPY", "KARL STORZ"],
    ["Servicing of Infusion Pumps", "INFUSION", "Medcaptain"],
    ["Maintenance Contract for Digital X-Ray Machine", "XRAY_DR", "Skanray"],
    ["Repair of Infusion Pumps", "INFUSION", "Skanray"],
    ["Annual Maintenance of Endoscopy System", "ENDOSCOPY", "KARL STORZ"],
    ["Replacement of Detector in DR System", "XRAY_DR", "Samsung Healthcare"],
    ["Servicing of Electrosurgical Unit", "ELECTROSURGERY", "Skanray"],
    ["Comprehensive Maintenance Contract of Anaesthesia Workstation", "ANAESTHESIA", "Skanray"],
    ["Supply, installation and commissioning of Digital X-Ray", "XRAY_DR", "Samsung Healthcare"],
    ["Portable Ultrasound Machine with LCD Monitor", "ULTRASOUND", "Samsung Healthcare"],
    ["Repair works for ICU Ventilator", "VENTILATION", "Hamilton Medical"],
    ["Repair of patient trolley", "STRETCHERS", "LINET"],
    ["Supply of hospital beds", "HOSPITAL_BEDS", "LINET"],
    ["Supply of ICU ventilators including electrical works", "VENTILATION", "Skanray"],
  ])("retains actual device procurement under broad Works metadata: %s", (title, category, brand) => {
    const official = {tenderCategory: "Works"};
    expect(classifyMedical(title, title, official).categories).toContain(category);
    expect(matchBrands(title, undefined, title, official)).toContainEqual(expect.objectContaining({brand, matchType: "portfolio"}));
  });

  it("keeps ancillary installation boilerplate and excludes department-derived extra categories", () => {
    const title = "Supply of ICU ventilators";
    const text = `${title}\nFor Anaesthesia Department\nVendor must perform electrical works before installation.`;
    const result = classifyMedical(text, title, {tenderCategory: "Goods"});
    expect(result.categories).toEqual(["VENTILATION"]);
    expect(matchBrands(text, result.categories, title).map(m => m.brand)).toEqual(["Hamilton Medical", "Skanray"]);
  });
});

describe("authoritative category preservation and precedence", () => {
  it("rejects Civil Works before body device/brand boilerplate can add matches", () => {
    const title = "Repair work in Anaesthesia Department";
    const text = `${title}\nGeneral Terms and Conditions\nSupply of Samsung ultrasound and Medcaptain infusion pumps`;
    const official = {tenderCategory: "Works", productCategory: "Civil Works"};
    expect(classifyMedical(text, title, official).isMedical).toBe(false);
    expect(matchBrands(text, undefined, title, official)).toEqual([]);
  });
  it.each(["Civil Works", "Building Work", "Repair and Maintenance of Building", "Electrical Works",
    "Plumbing Works", "Road Works", "Drainage", "Painting", "Renovation", "Carpentry", "HVAC building work",
    "Fire safety infrastructure", "Lift maintenance", "Generator/DG work", "Transformer work",
    "Electrical cabling", "Water supply", "Sewage", "Public works"])("does not infer devices from authoritative %s", productCategory => {
    const title = "Work in Anaesthesia Department";
    expect(classifyMedical(title, title, {tenderCategory: "Works", productCategory}).isMedical).toBe(false);
  });
  it("retains explicitly procured devices even when a portal category is overly broad", () => {
    const title = "Repair of ICU Ventilators";
    expect(classifyMedical(title, title, {tenderCategory: "Works", productCategory: "Civil Works"}).isMedical).toBe(true);
  });
  it("uses a tender-specific description for a vague Works title with an explicit item", () => {
    expect(classifyMedical("Supply of infusion pumps", "Procurement notice", {tenderCategory: "Works"}).isMedical).toBe(true);
  });
  it("does not use general clinical context as a Works-category override", () => {
    const title = "Maintenance contract";
    expect(classifyMedical("The hospital already owns patient monitors", title, {productCategory: "Civil Works"}).isMedical).toBe(false);
  });
  it("preserves official Goods/Medical Equipment categories in normalized device records", () => {
    const raw = {...civil, title: "Multiparameter Patient Monitor", description: undefined,
      tenderCategory: "Goods", productCategory: "Medical Equipment", procurementCategory: "Goods", workCategory: "Supply"};
    expect(normalizeTender(raw, false, now)).toMatchObject({tenderCategory: "Goods", productCategory: "Medical Equipment",
      procurementCategory: "Goods", workCategory: "Supply", categories: ["PATIENT_MONITORING"]});
  });
  it("retains official categories from a lower-ranked duplicate when the selected row lacks them", () => {
    const raw = {...civil, title: "Patient monitor", description: undefined, tenderCategory: "Goods", productCategory: "Medical Equipment"};
    const record = normalizeTender(raw, false, now)!;
    const later = {...record, tenderCategory: undefined, productCategory: undefined, checkedAt: "2026-10-01T13:00:00Z"};
    expect(deduplicate([record, later]).tenders[0]).toMatchObject({tenderCategory: "Goods", productCategory: "Medical Equipment"});
  });
  it("extracts all exposed authoritative NIC categories and rejects the real civil tender", () => {
    const field = (k: string, v: string) => `<tr><td>${k}</td><td>${v}</td></tr>`;
    const html = `<table>${field("Tender ID", civil.tenderId!)}${field("Title", civil.title)}${field("Tender Category", "Works")}${field("Product Category", "Civil Works")}${field("Procurement Category", "Works")}${field("Work Category", "Building repair")}${field("Work Description", civil.description!)}</table>`;
    const enriched = enrichNicDetail({...civil, tenderCategory: undefined, productCategory: undefined}, html, civil.sourceUrl);
    expect(enriched).toMatchObject({tenderCategory: "Works", productCategory: "Civil Works", procurementCategory: "Works", workCategory: "Building repair"});
    expect(normalizeTender(enriched, false, now)).toBeUndefined();
  });
});

// Department-derived portfolio removal must retain the actual clinical training item.
describe("clinical items retained during baseline reprocessing", () => {
  it.each([
    "Radiofrequency Generator with Vessel Sealing and Bipolar Resection",
    "Male IV arm Training arm for Department of Anaesthesiology",
    "Arterial arm trainer for Department of Anaesthesiology",
    "HEIMLICH ABDOMINAL THRUST model for Department of Anaesthesiology",
    "Advance Epidural and Lumbar puncture model for Department of Anaesthesiology",
    "Automatic CPR Machine for Department of Anaesthesiology",
  ])("retains the medical item in %s", title => {
    expect(classifyMedical(title).isMedical).toBe(true);
    expect(classifyMedical(title).categories).not.toContain("ANAESTHESIA");
    expect(matchBrands(title)).not.toContainEqual(expect.objectContaining({brand: "Medcaptain"}));
  });
});
