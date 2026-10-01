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

describe("clinical portfolio regression cases", () => {
  it("routes echo equipment to ultrasound portfolios, not Spacelabs cardiology diagnostics", () => {
    expect(classifyMedical("echocardiography machine").categories).toContain(
      "ULTRASOUND",
    );
    expect(matchBrands("echocardiography machine")).toContainEqual(
      expect.objectContaining({
        brand: "Samsung Healthcare",
        matchType: "portfolio",
      }),
    );
    expect(matchBrands("echocardiography machine")).not.toContainEqual(
      expect.objectContaining({ brand: "Spacelabs Healthcare" }),
    );
  });
  it.each([
    "electrocautery",
    "electro-cautery",
    "electro cautery",
    "electro-surgical unit",
  ])("recognizes %s", (text) => {
    expect(classifyMedical(text).categories).toContain("ELECTROSURGERY");
    expect(matchBrands(text).map((m) => m.brand)).toEqual([
      "KARL STORZ",
      "Skanray",
    ]);
  });
  it.each([
    "Sprint",
    "Eclipse",
    "Sentinel",
    "Athena",
    "R20",
    "HOPKINS",
    "Rubina",
    "OR1",
    "Virtuoso",
    "Evo",
    "SMART Center",
  ])(
    "does not interpret ambiguous name %s without clinical context",
    (text) => {
      expect(classifyMedical(text).isMedical).toBe(false);
      expect(matchBrands(text)).toEqual([]);
    },
  );
  it.each([
    ["GC85", "Samsung Healthcare"],
    ["GM85 Fit", "Samsung Healthcare"],
    ["BodyTom", "Samsung Healthcare"],
    ["OmniTom", "Samsung Healthcare"],
    ["H900", "Hamilton Medical"],
    ["C-MAC", "KARL STORZ"],
    ["AUTOCON", "KARL STORZ"],
    ["FloSkan", "Skanray"],
  ])("retains unique clinical model-only title %s", (text, brand) => {
    expect(classifyMedical(text).isMedical).toBe(true);
    expect(matchBrands(text)).toContainEqual(
      expect.objectContaining({ brand }),
    );
  });
  it("allows nonmedical installation boilerplate when the procurement title is clinical", () => {
    const title = "Supply of ICU ventilators";
    const body = `${title}. Vendor must perform electrical works and air conditioning inspection before installation.`;
    expect(classifyMedical(body, title).isMedical).toBe(true);
    expect(matchBrands(body, undefined, title)).toContainEqual(
      expect.objectContaining({ brand: "Hamilton Medical" }),
    );
  });
  it.each(["Supply of office chairs", "Water pumps", "Equipment supply"])(
    "retains body exclusion for nonclinical or vague title %s",
    (title) => {
      const body = `${title}. Office furniture and electrical works. Buyer manages ICU ventilators and patient monitors.`;
      expect(classifyMedical(body, title).isMedical).toBe(false);
      expect(matchBrands(body, undefined, title)).toEqual([]);
    },
  );
  it("requires clinical furniture evidence for LINET", () => {
    expect(matchBrands("operating table")).not.toContainEqual(
      expect.objectContaining({ brand: "LINET" }),
    );
    expect(matchBrands("bedside cabinets")).toContainEqual(
      expect.objectContaining({ brand: "LINET", matchType: "portfolio" }),
    );
  });
});

describe("requested portfolio products and narrowly scoped accessories", () => {
  it.each([
    ["mobile CT", "Samsung Healthcare"],
    ["portable CT", "Samsung Healthcare"],
    ["flat panel detector", "Samsung Healthcare"],
    ["echo machine", "Samsung Healthcare"],
    ["ICU monitor", "Spacelabs Healthcare"],
    ["ICU monitor", "Skanray"],
    ["heated humidifier", "Hamilton Medical"],
    ["NIV mask", "Hamilton Medical"],
    ["flow sensor", "Hamilton Medical"],
    ["expiratory valve", "Hamilton Medical"],
    ["HMEF", "Hamilton Medical"],
    ["nasal cannula", "Hamilton Medical"],
    ["infusion set", "Medcaptain"],
    ["DVT pump", "Medcaptain"],
    ["VTE pump", "Medcaptain"],
    ["spirometer", "Medcaptain"],
    ["closed-suction catheter", "Medcaptain"],
    ["blood grouping", "Medcaptain"],
    ["blood-grouping analyzer", "Medcaptain"],
    ["treatment chair", "LINET"],
    ["examination chair", "LINET"],
    ["hospital furniture", "LINET"],
  ])("maps %s to %s using portfolio evidence", (text, brand) => {
    expect(classifyMedical(text).isMedical).toBe(true);
    expect(matchBrands(text)).toContainEqual(
      expect.objectContaining({ brand, matchType: "portfolio" }),
    );
  });
  it.each([
    ["oxygen concentrator", "Hamilton Medical"],
    ["microscope", "Spacelabs Healthcare"],
    ["operating table", "LINET"],
    ["sutures", "Medcaptain"],
    ["4K ultrasound", "KARL STORZ"],
    ["fluorescence microscope", "KARL STORZ"],
  ])("does not extend %s to unsupported portfolio %s", (text, brand) => {
    expect(matchBrands(text)).not.toContainEqual(
      expect.objectContaining({ brand }),
    );
  });
  it.each(["EEG machine", "electroencephalograph"])(
    "keeps %s as general medical equipment",
    (text) => {
      expect(classifyMedical(text).categories).toContain(
        "OTHER_MEDICAL_EQUIPMENT",
      );
      expect(matchBrands(text)).toEqual([]);
    },
  );
});
