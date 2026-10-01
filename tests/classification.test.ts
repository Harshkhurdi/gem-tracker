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

describe("production portfolio precision", () => {
  it.each([
    "Procurement of Digital PET/CT Scanner 128 Slice",
    "PET-CT scanner",
    "PET CT scanner",
  ])(
    "retains hybrid imaging without inventing a Samsung CT opportunity: %s",
    (text) => {
      expect(classifyMedical(text).categories).toEqual(["DIAGNOSTIC_IMAGING"]);
      expect(matchBrands(text)).toEqual([]);
    },
  );
  it("retains fixed CT as clinical but limits Samsung generic CT to its mobile scope", () => {
    const title = "Rate Contract of 256 SLICE CT SCANER";
    expect(classifyMedical(title).categories).toContain("CT");
    expect(matchBrands(title)).toEqual([]);
    expect(matchBrands("portable computed tomography scanner")).toContainEqual(
      expect.objectContaining({
        brand: "Samsung Healthcare",
        matchType: "portfolio",
      }),
    );
    expect(matchBrands("Samsung CT scanner")).toContainEqual(
      expect.objectContaining({
        brand: "Samsung Healthcare",
        matchType: "explicit-brand",
      }),
    );
  });
  it("keeps proprietary SpyGlass clinical without claiming a KARL STORZ opportunity", () => {
    const title =
      "Procurement of Spy Glass Digital Controller for Gastroenterology";
    expect(classifyMedical(title).categories).toContain("ENDOSCOPY");
    expect(matchBrands(title)).toEqual([]);
    expect(
      matchBrands("SpyGlass controller and laparoscopic instruments"),
    ).toContainEqual(
      expect.objectContaining({ brand: "KARL STORZ", matchType: "portfolio" }),
    );
  });
  it.each(["Clinical fluoroscopy system", "Digital fluoroscopy machine"])(
    "retains ambiguous fluoroscopy as imaging without inferring a C-arm: %s",
    (text) => {
      expect(classifyMedical(text).categories).toEqual(["DIAGNOSTIC_IMAGING"]);
      expect(matchBrands(text)).toEqual([]);
    },
  );
  it.each([
    ["Xray machine", "XRAY_DR", "Samsung Healthcare"],
    ["X ray machines", "XRAY_DR", "Skanray"],
    ["CArm machine", "C_ARM", "Skanray"],
    ["C-Arms for clinical fluoroscopy", "C_ARM", "Skanray"],
    ["Multi Parameter Monitor", "PATIENT_MONITORING", "Spacelabs Healthcare"],
    ["Multi-parameters monitors", "PATIENT_MONITORING", "Skanray"],
    ["Haemostasis analyser", "COAGULATION", "Medcaptain"],
    ["Hemostasis analyzer", "COAGULATION", "Medcaptain"],
  ])("recognizes procurement spelling %s", (text, category, brand) => {
    expect(classifyMedical(text).categories).toContain(category);
    expect(matchBrands(text)).toContainEqual(
      expect.objectContaining({ brand, matchType: "portfolio" }),
    );
  });
  it.each([
    ["Samsung ultrasound", "Samsung Healthcare"],
    ["Hamilton ventilator", "Hamilton Medical"],
    ["Karl Storz endoscope", "KARL STORZ"],
    ["LINET hospital bed", "LINET"],
    ["Medcaptain infusion pump", "Medcaptain"],
    ["Spacelabs patient monitor", "Spacelabs Healthcare"],
    ["Skanray C-arm", "Skanray"],
  ])("preserves explicit manufacturer evidence: %s", (text, brand) =>
    expect(matchBrands(text)).toContainEqual(
      expect.objectContaining({ brand, matchType: "explicit-brand" }),
    ),
  );
  it("rejects office works mentioning clinical boilerplate", () => {
    const title = "Office works and office supplies";
    const body = `${title}; buyer department uses patient monitors and ultrasound`;
    expect(classifyMedical(body, title).isMedical).toBe(false);
    expect(matchBrands(body, undefined, title)).toEqual([]);
  });
});

describe("nonprocurement educational notices", () => {
  it.each([
    "Diploma Radiography Admission Notice & Forms",
    "Radiography admission forms",
    "Radiography examination results",
    "Radiography course fees",
  ])("excludes %s", (text) => {
    expect(classifyMedical(text).isMedical).toBe(false);
    expect(matchBrands(text)).toEqual([]);
  });
  it("retains actual equipment bids for teaching", () => {
    expect(
      classifyMedical(
        "Supply of radiography equipment for Diploma course teaching laboratory",
      ).isMedical,
    ).toBe(true);
  });
});

describe("source-backed broad clinical procurements", () => {
  it.each([
    "E- tender fro the procurement of various equipement for Department of Orthopaedic surgery(Trauma Centre), IGMC Shimla.",
    "Mahinery and equipment for Deptt of Pathology under DIAMONDS project",
  ])("retains %s without guessing portfolio", (text) => {
    expect(classifyMedical(text).categories).toEqual([
      "OTHER_MEDICAL_EQUIPMENT",
    ]);
    expect(matchBrands(text)).toEqual([]);
  });
  it("does not derive medical scope from institution alone", () => {
    expect(
      classifyMedical("Procurement of equipment for office at IGMC Shimla")
        .isMedical,
    ).toBe(false);
  });
});

describe("biochemistry procurement scope", () => {
  it.each([
    "GeM Bid for Procurement of Ammonia Kits and Controls – Department of Biochemistry",
    "Biochemistry Reagent Kit for Human Samples (Q2)",
    "NIQ for procurement of consumables for department of Biochemistry",
  ])(
    "retains laboratory procurement %s without guessing manufacturer",
    (text) => {
      expect(classifyMedical(text).categories).toEqual(["LAB_IVD"]);
      expect(matchBrands(text)).toEqual([]);
    },
  );
  it("requires laboratory context for ammonia kits and general consumables", () => {
    expect(
      classifyMedical("Ammonia kits and controls for industrial refrigeration")
        .isMedical,
    ).toBe(false);
    expect(
      classifyMedical("Consumables for administrative department").isMedical,
    ).toBe(false);
  });
});
