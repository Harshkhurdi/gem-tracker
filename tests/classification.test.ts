import { describe, it, expect } from "vitest";
import { classifyMedical, matchBrands } from "../src/lib/tender/classifier";
describe("deterministic medical relevance and portfolio matching", () => {
  it.each([
    "Water supply and sewage works at Government Hospital",
    "LCD monitor for office",
    "Office chairs",
    "Road construction",
    "DG set",
    "Lift maintenance",
  ])("rejects nonmedical scope: %s", (text) => {
    expect(classifyMedical(text).isMedical).toBe(false);
    expect(matchBrands(text)).toEqual([]);
  });
  it.each(["bed", "chair", "pump", "monitor"])(
    "does not invent clinical context for %s",
    (text) => {
      expect(classifyMedical(text).isMedical).toBe(false);
      expect(matchBrands(text)).toEqual([]);
    },
  );
  it("classifies clinical equipment and matches multiple plausible portfolios without asserting brands", () => {
    expect(
      classifyMedical("Supply of multiparameter patient monitors").categories,
    ).toContain("PATIENT_MONITORING");
    expect(
      matchBrands("Supply of multiparameter patient monitors").map((m) => [
        m.brand,
        m.matchType,
      ]),
    ).toEqual([
      ["Spacelabs Healthcare", "portfolio"],
      ["Skanray", "portfolio"],
    ]);
  });
  it.each([
    ["Samsung ultrasound", "Samsung Healthcare", "explicit-brand"],
    ["HAMILTON C6 ventilator", "Hamilton Medical", "explicit-brand"],
    ["GC85 digital radiography", "Samsung Healthcare", "explicit-model"],
    ["C-MAC video laryngoscope", "KARL STORZ", "explicit-model"],
    ["Eleganza ICU bed", "LINET", "explicit-model"],
    ["Qube patient monitor", "Spacelabs Healthcare", "explicit-model"],
    ["FloSkan infusion pump", "Skanray", "explicit-model"],
  ])("recognizes %s", (text, brand, matchType) =>
    expect(matchBrands(text)).toContainEqual(
      expect.objectContaining({ brand, matchType }),
    ),
  );
  it("supports the seven portfolios with concrete clinical context", () => {
    expect(
      matchBrands("Infusion pumps coagulation analyzer").map((m) => m.brand),
    ).toContain("Medcaptain");
    expect(
      matchBrands("HFNC breathing circuits").map((m) => m.brand),
    ).toContain("Hamilton Medical");
    expect(
      matchBrands("Laparocator and arthroscopy equipment").map((m) => m.brand),
    ).toContain("KARL STORZ");
    expect(
      matchBrands("Hospital beds and pressure relieving mattress").map(
        (m) => m.brand,
      ),
    ).toContain("LINET");
  });
  it.each([
    "breastboard",
    "PICC training mannequin",
    "dialysis machine",
    "hospital trolley",
    "prosthetic limb",
    "colposcope",
  ])("retains medical equipment outside brand portfolios: %s", (text) =>
    expect(classifyMedical(text).isMedical).toBe(true),
  );
  it("does not treat 4K as a clinical portfolio match across unrelated categories", () =>
    expect(matchBrands("4K ultrasound imaging")).not.toContainEqual(
      expect.objectContaining({ brand: "KARL STORZ" }),
    ));
  it("matches clinical chairs to LINET", () =>
    expect(matchBrands("Clinical chairs for patients")).toContainEqual(
      expect.objectContaining({ brand: "LINET", matchType: "portfolio" }),
    ));
  it("does not match Hamilton to generic oxygen equipment", () =>
    expect(matchBrands("Oxygen concentrator")).not.toContainEqual(
      expect.objectContaining({ brand: "Hamilton Medical" }),
    ));
});

// Real listing false positives discovered during the live validation.
describe("Infrastructure mentioning clinical rooms or stretchers", () => {
  for (const title of [
    "ELECTRICAL POINTS IN PHYSIOTHERAPY OPD, DENTAL AREA AND X-RAY ROOM IN GMCH",
    "AMC of 13 passenger stretcher elevator at IGMC Shimla",
  ])
    it(title, () => {
      expect(classifyMedical(title).isMedical).toBe(false);
      expect(matchBrands(title)).toEqual([]);
    });
});

describe("Clinical procurement outside the seven manufacturer portfolios", () => {
  for (const title of ["PACEMAKERS", "Purchase of brachytherapy machine"])
    it(title, () => expect(classifyMedical(title).isMedical).toBe(true));
});
