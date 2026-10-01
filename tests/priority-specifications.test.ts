import {
  reviewedScanPages,
  reviewedScans,
} from "../src/lib/specification/reviewed-scans";
import { extractSubmissionDeadline } from "../src/lib/tender/deadline";
import { PassThrough } from "node:stream";
import {
  SourceHttp,
  sourceResponseStream,
  rememberDocumentBytes,
  recentDocumentBytes,
} from "../src/lib/sources/http";
import { describe, it, expect } from "vitest";
import { extractSpecifications } from "../src/lib/specification/extract";
import {
  priorityCategories,
  genericPriorityCandidate,
  currentCandidate,
} from "../src/lib/config/priority-equipment";
import {
  documentIdentityMatches,
  linkRetenders,
  inspectPriorityTender,
} from "../src/lib/specification/enrich";
import {
  parseXlsx,
  validateXlsx,
  linkedDocuments,
  officialDocumentLinks,
} from "../src/lib/specification/documents";
import { parseInstitution } from "../src/lib/sources/adapters/institution";
import { filterAndSortTenders } from "../src/lib/tender/dashboard-filter";
import { normalizeTender } from "../src/lib/tender/normalize";
import type {
  ParsedDocument,
  PriorityEquipment,
} from "../src/types/specification";
import type { RawTender } from "../src/types/tender";
import Excel from "exceljs";

const now = new Date("2026-10-01T12:00:00Z");
const raw = (title: string): RawTender => ({
  title,
  region: "Punjab",
  institutionId: "aiims-bathinda",
  sourceId: "aiims-bathinda",
  sourceName: "Official institution",
  sourceUrl: "https://www.aiimsbathinda.edu.in/",
  publishDate: "2026-09-25",
  originalClosingDate: "2026-10-15T17:00:00+05:30",
  fetchedAt: now.toISOString(),
  verification: "listing",
});
const doc = (
  text: string,
  extra: Partial<ParsedDocument> = {},
): ParsedDocument => ({
  label: "Technical specification",
  url: "https://www.aiimsbathinda.edu.in/spec.pdf",
  type: "technical-specification",
  status: "parsed",
  pages: [{ page: 17, text }],
  productText: text,
  ...extra,
});
const fixtures: [PriorityEquipment, string, string[]][] = [
  [
    "VENTILATORS",
    `Technical Specifications - ICU ventilator\nShall support adult, pediatric and neonatal patients\nRequired modes PRVC, APRV, NIV and HFNC\nHeated humidifier quantity 10\nNeonatal flow sensor quantity 50\nBattery runtime shall be at least 120 minutes\nWarranty shall be 2 years\nCMC shall be 8 years after warranty\nUptime shall be 95%\nResponse time shall be 24 hours\nConsumables excluded from CMC\nCDSCO registration required`,
    [
      "Adult",
      "PRVC",
      "humidifier",
      "flow sensor",
      "120",
      "2 years",
      "8 years",
      "95%",
    ],
  ],
  [
    "ULTRASOUND",
    `Technical Specifications - Ultrasound\nConvex probe 2-5 MHz quantity 1\nLinear probe 5-12 MHz quantity 1\nPhased array probe and TVS shall be included\nShear wave elastography, CEUS and 3D/4D required\nDICOM and PACS support required\nOnline UPS runtime 30 minutes\nWarranty 3 years\nOEM authorization required`,
    [
      "convex",
      "linear",
      "phased",
      "TVS",
      "elastography",
      "CEUS",
      "3D",
      "DICOM",
      "UPS",
    ],
  ],
  [
    "DEFIBRILLATORS",
    `Technical Specifications - Defibrillator\nBiphasic, manual mode and AED mode required\nTranscutaneous pacing in demand mode\nAdult paddles and pediatric paddles quantity 2\nSpO2 NIBP EtCO2 monitoring required\nBattery shall provide 100 shocks\nIEC 60601-2-4 certification required\nEMD INR 100000\nDelivery within 30 days\nUser training required`,
    [
      "biphasic",
      "AED",
      "pacing",
      "paddles",
      "SpO2",
      "NIBP",
      "EtCO2",
      "100 shocks",
    ],
  ],
  [
    "HOSPITAL_BEDS",
    `Technical Specifications - ICU bed\n4-section motorized platform required\nTrendelenburg and reverse Trendelenburg\nManual CPR and one-touch electric CPR\nSplit side rails with locks\nCastors with central locking\nSafe working load 250 kg\nPressure relief mattress thickness 150 mm\nIV pole quantity 1`,
    [
      "4-section",
      "motorized",
      "Trendelenburg",
      "CPR",
      "rails",
      "locking",
      "250 kg",
      "mattress",
      "IV pole",
    ],
  ],
  [
    "ENDOSCOPY",
    `Technical Specifications - Video endoscopy\nVideo gastroscope and colonoscope required\nVideo processor, LED light source and medical-grade monitor\nBiopsy forceps quantity 10\nAER and automatic leak tester required\nDrying scope storage cabinet with HEPA\nCMC includes bending rubber and insertion tube\nWarranty 2 years`,
    [
      "gastroscope",
      "colonoscope",
      "processor",
      "light source",
      "monitor",
      "forceps",
      "AER",
      "leak tester",
      "storage cabinet",
      "CMC",
    ],
  ],
];
describe("source-backed priority specification extraction", () => {
  for (const [category, text, terms] of fixtures) {
    it(`extracts ${category} without adding defaults`, () => {
      const result = extractSpecifications([doc(text)], [category], now);
      expect(result.extractionStatus).toBe("complete");
      const items = Object.values(result.sections).flat();
      for (const term of terms)
        expect(
          items.some((i) =>
            i.requirement.toLowerCase().includes(term.toLowerCase()),
          ),
        ).toBe(true);
      for (const item of items) {
        expect(item.sourceDocument).toBe(doc("").url);
        expect(item.sourcePage).toBe(17);
        expect(text).toContain(item.requirement);
      }
    });
  }
  it("keeps warranty and CMC separate and derives no unsupported duration or certification", () => {
    const result = extractSpecifications(
      [
        doc(
          "Technical Specifications\nBattery runtime 120 minutes\nWarranty 2 years\nCMC 8 years after warranty",
        ),
      ],
      ["VENTILATORS"],
    );
    expect(result.sections.warranty.map((item) => item.requirement)).toEqual([
      "Warranty 2 years",
    ]);
    expect(result.sections.cmc[0].requirement).toBe(
      "CMC 8 years after warranty",
    );
    expect(result.sections.regulatoryRequirements).toEqual([]);
    expect(
      extractSpecifications([doc("Ventilator")], ["VENTILATORS"]).sections
        .warranty,
    ).toEqual([]);
  });
  it("does not turn GeMARPTS discovery results into actual requirements", () => {
    const result = extractSpecifications(
      [
        doc(
          "GeMARPTS\nSearched Result generated\nICU beds defibrillators\nMinimum Average Annual Turnover 100 lakh\nBattery backup must be 60 minutes",
        ),
      ],
      ["VENTILATORS"],
    );
    expect(JSON.stringify(result.sections)).not.toContain("ICU beds");
    expect(result.sections.bidderEligibility).toHaveLength(1);
  });
  it("retains negative and optional clauses without claiming they are mandatory", () => {
    const result = extractSpecifications(
      [
        doc(
          "FDA is not required\nPacing is optional\nCDSCO registration shall be mandatory",
        ),
      ],
      ["DEFIBRILLATORS"],
    );
    expect(result.sections.regulatoryRequirements[0].mandatory).toBe(false);
    expect(result.sections.technicalRequirements[0].mandatory).toBe(false);
    expect(result.sections.regulatoryRequirements[1].mandatory).toBe(true);
  });
  it("latest dated amendment replaces a requirement and preserves history", () => {
    const old = doc(
      "Technical Specifications\nBattery runtime shall be 2 hours",
    );
    const middle = doc("Battery runtime amended: read as 90 minutes", {
      url: "https://www.aiimsbathinda.edu.in/c1.pdf",
      type: "corrigendum",
      publishedDate: "2026-09-26",
    });
    const latest = doc("Battery runtime amended: read as 60 minutes", {
      url: "https://www.aiimsbathinda.edu.in/c2.pdf",
      type: "corrigendum",
      publishedDate: "2026-09-28",
    });
    const result = extractSpecifications(
      [latest, old, middle],
      ["VENTILATORS"],
    );
    expect(
      result.sections.technicalRequirements.map((i) => i.requirement),
    ).toEqual([latest.pages[0].text]);
    expect(result.supersededRequirements).toHaveLength(2);
  });
  it("reports scanned, unavailable and deferred documents honestly", () => {
    for (const status of ["scanned", "unavailable", "deferred"] as const)
      expect(
        extractSpecifications([doc("", { status })], ["ULTRASOUND"])
          .extractionStatus,
      ).toBe("document-unavailable");
    expect(
      extractSpecifications(
        [
          doc("Technical Specifications\nBattery 2 hours"),
          doc("", {
            url: "https://www.aiimsbathinda.edu.in/boq.xlsx",
            status: "deferred",
          }),
        ],
        ["VENTILATORS"],
      ).extractionStatus,
    ).toBe("partial");
  });
});
describe("priority discovery without medical-relevance relaxation", () => {
  it.each([
    "Renovation of Anaesthesia Department",
    "Building ventilation system",
    "Office furniture and beds",
    "Civil work in Endoscopy Room",
    "Computer monitor",
  ])("rejects %s", (title) =>
    expect(priorityCategories(raw(title))).toEqual([]),
  );
  it.each([
    "ICU Equipment",
    "Critical Care Equipment",
    "Medical Equipment Package",
    "Hospital Furniture",
    "Diagnostic Imaging Equipment",
    "OT Equipment",
  ])("inspects but does not invent a product for %s", (title) => {
    expect(genericPriorityCandidate(raw(title))).toBe(true);
    expect(priorityCategories(raw(title))).toEqual([]);
  });
  it.each([
    "Supply of ICU ventilator",
    "Repair of Colour Doppler ultrasound",
    "Monitor-defibrillator with pacing",
    "Motorised hospital bed",
    "Supply of Ueretero-Renoscope",
  ])("preserves genuine device %s", (title) =>
    expect(priorityCategories(raw(title)).length).toBeGreaterThan(0),
  );
  it("excludes obsolete unknown and expired notices from deep processing", () => {
    expect(
      currentCandidate(
        {
          ...raw("ventilator"),
          originalClosingDate: undefined,
          publishDate: "2025-01-01",
        },
        now.getTime(),
      ),
    ).toBe(false);
    expect(
      currentCandidate(
        { ...raw("ventilator"), originalClosingDate: "2026-09-20" },
        now.getTime(),
      ),
    ).toBe(false);
  });
  it("rejects another tender's document identity", () =>
    expect(
      documentIdentityMatches(
        { ...raw("Ultrasound"), tenderId: "GEM/2026/B/111" },
        "Bid Number GEM/2026/B/222",
      ),
    ).toBe(false));
  it("finds only officially linked documents", () => {
    const links = linkedDocuments(
      '<a href="https://evil.test/s.pdf">Technical specification</a><a href="/boq.xlsx">BOQ</a>',
      "https://www.aiimsbathinda.edu.in/",
    );
    expect(links).toEqual([
      { url: "https://www.aiimsbathinda.edu.in/boq.xlsx", label: "BOQ" },
    ]);
  });
  it("discovers Bathinda quotations omitted by GeM-only parsing", () => {
    const html =
      '<table><tr><td>1</td><td>AIIMS/BTI/Q/324</td><td>Ueretero-Renoscope</td><td>24-Sep-2026</td><td>07-Oct-2026</td><td><a href="/scope.pdf">Quotation document</a></td></tr></table>';
    expect(
      parseInstitution(html, "aiims-bathinda-open", now.toISOString())[0]
        .referenceNumber,
    ).toBe("AIIMS/BTI/Q/324");
    expect(() =>
      parseInstitution(html, "aiims-bathinda", now.toISOString()),
    ).toThrow();
  });
  it("annotates a replacement only for a cancelled same-item same-authority notice", () => {
    const old = {
      ...raw("Supply of ultrasound"),
      cancelled: true,
      tenderId: "old",
    };
    const current = raw("Re-tender Supply of ultrasound");
    linkRetenders([old, current]);
    expect(current.notes?.join()).toContain("Possible replacement");
  });
});
describe("safe BOQ reading", () => {
  it("reads quantity and row provenance while skipping formulas", async () => {
    const wb = new Excel.Workbook(),
      sheet = wb.addWorksheet("BOQ");
    sheet.addRow(["Item description", "Quantity", "Unit"]);
    sheet.addRow(["ICU ventilator", 10, "nos"]);
    sheet.addRow([
      { formula: 'HYPERLINK("https://bad.test","APRV")', result: "APRV" },
    ]);
    const pages = await parseXlsx(new Uint8Array(await wb.xlsx.writeBuffer()));
    expect(pages[1]).toMatchObject({
      sheet: "BOQ",
      row: 2,
      text: "Item description: ICU ventilator | Quantity: 10 | Unit: nos",
    });
    expect(pages.some((p) => p.text.includes("APRV"))).toBe(false);
  });
  it("rejects unsupported binary XLS", () =>
    expect(() => validateXlsx(new Uint8Array([1, 2, 3, 4, 5]))).toThrow());
});
describe("priority search and urgency", () => {
  it("searches actual extracted features and prioritizes tomorrow over next-month brand matches", () => {
    const a = normalizeTender(
      {
        ...raw("ICU ventilator"),
        tenderId: "soon",
        originalClosingDate: "2026-10-02T17:00:00+05:30",
      },
      false,
      now,
    )!;
    const b = normalizeTender(
      {
        ...raw("Ultrasound"),
        tenderId: "later",
        originalClosingDate: "2026-11-01T17:00:00+05:30",
      },
      false,
      now,
    )!;
    a.specification = extractSpecifications(
      [
        doc(
          "Technical Specifications\nAPRV and HFNC required\nCMC shall be 8 years after warranty",
        ),
      ],
      ["VENTILATORS"],
    );
    const filters = {
      query: "",
      region: "",
      institution: "",
      scope: "",
      status: "active",
      category: "",
      brand: "",
      explicit: false,
      source: "",
      closing: "",
      sort: "closing",
      prioritize: true,
    };
    expect(
      filterAndSortTenders([b, a], filters, now.getTime())[0].tenderId,
    ).toBe("soon");
    expect(
      filterAndSortTenders(
        [a, b],
        { ...filters, query: "HFNC" },
        now.getTime(),
      ).map((t) => t.tenderId),
    ).toEqual(["soon"]);
    expect(
      filterAndSortTenders(
        [a, b],
        { ...filters, query: "8 year CMC" },
        now.getTime(),
      ).map((t) => t.tenderId),
    ).toEqual(["soon"]);
    expect(
      filterAndSortTenders(
        [a, b],
        { ...filters, priorityEquipment: "ULTRASOUND" },
        now.getTime(),
      ).map((t) => t.tenderId),
    ).toEqual(["later"]);
  });
});

describe("priority extraction regressions found in the live audit", () => {
  it("does not mistake legal compliance for respiratory monitoring", () => {
    const result = extractSpecifications(
      [
        doc(
          "Compliance of BOQ specification\nSeller shall ensure full compliance with applicable labour laws",
        ),
      ],
      ["ENDOSCOPY"],
    );
    expect(result.sections.technicalRequirements).toEqual([]);
    expect(result.extractionStatus).toBe("partial");
  });
  it("does not accept ultrasound gel, fetal monitoring, or training simulators as a priority system", () => {
    for (const title of [
      "Quotation for ultrasound gel",
      "Fetal Doppler",
      "Paediatric ultrasound simulator",
      "Laparoscopy simulator",
    ])
      expect(priorityCategories(raw(title))).toEqual([]);
  });
  it("uses only official PDF document targets from embedded links", () => {
    expect(
      officialDocumentLinks([
        { label: "Spec", url: "https://gem.gov.in/spec.pdf" },
        { label: "Instructions", url: "https://bad.test/spec.pdf" },
        { label: "Home", url: "https://gem.gov.in/" },
      ]),
    ).toEqual([{ label: "Spec", url: "https://gem.gov.in/spec.pdf" }]);
  });
  it("displays the amended value separately from the preserved original wording", () => {
    const result = extractSpecifications(
      [
        doc("Battery runtime 2 hours"),
        doc("Battery runtime 2 hours replaced: read as 60 minutes", {
          type: "corrigendum",
          publishedDate: "2026-09-30",
        }),
      ],
      ["VENTILATORS"],
    );
    expect(result.sections.technicalRequirements[0].value).toBe("60 minutes");
    expect(result.supersededRequirements[0].requirement).toBe(
      "Battery runtime 2 hours",
    );
  });
  it("accepts actual equipment inside an official generic BOQ without accepting civil scope", async () => {
    const wb = new Excel.Workbook(),
      sheet = wb.addWorksheet("BOQ");
    sheet.addRow(["Item description", "Quantity", "Unit"]);
    sheet.addRow(["ICU ventilator including installation wiring", 10, "nos"]);
    const bytes = await wb.xlsx.writeBuffer();
    const http = {
      fetch: async () =>
        new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }),
    } as unknown as SourceHttp;
    const generic = {
      ...raw("Procurement of ICU equipment"),
      documents: [
        { label: "BOQ", url: "https://www.aiimsbathinda.edu.in/boq.xlsx" },
      ],
    };
    await inspectPriorityTender(generic, http);
    expect(normalizeTender(generic, false, now)?.priorityCategories).toContain(
      "VENTILATORS",
    );
    expect(generic.specification?.sections.quantity[0].quantity).toBe("10");
    const civil = {
      ...raw("Renovation of Anaesthesia Department"),
      documents: generic.documents,
    };
    await inspectPriorityTender(civil, http);
    expect(normalizeTender(civil, false, now)).toBeUndefined();
  });
  it("cancels a protected HTML download without enqueuing into a closed stream", async () => {
    const incoming = new PassThrough();
    const stream = sourceResponseStream(incoming);
    await stream.cancel();
    expect(() => {
      incoming.emit("data", Buffer.from("late HTML"));
      incoming.emit("end");
      incoming.emit("error", Error("late close"));
    }).not.toThrow();
    expect(incoming.destroyed).toBe(true);
  });
});

describe("reviewed official scans", () => {
  it("does not present post-warranty maintenance or CMC uptime as equipment warranty", () => {
    const result = extractSpecifications(
      [
        doc(
          "Technical Specifications\nWarranty of required product: 2 Year\nComprehensive Maintenance Duration (Post Warranty): 8 Year\nCMC shall include calibration and spares, after satisfactory completion of Warranty.\nThere will be 98% uptime warranty during CMC period.",
        ),
      ],
      ["ENDOSCOPY"],
    );
    expect(result.sections.warranty.map((item) => item.requirement)).toEqual([
      "Warranty of required product: 2 Year",
    ]);
    expect(result.sections.cmc).toHaveLength(3);
    expect(
      result.sections.serviceRequirements.some((item) =>
        item.requirement.includes("98%"),
      ),
    ).toBe(true);
  });

  it("requires both exact URL and matching fresh bytes", () => {
    const d = reviewedScans[0];
    expect(reviewedScanPages(d.url, "changed")).toBeUndefined();
    expect(
      reviewedScanPages("https://www.aiimsbathinda.edu.in/other.pdf", d.sha256),
    ).toBeUndefined();
    expect(reviewedScanPages(d.url, d.sha256)?.[2].page).toBe(5);
  });
  it("marks selected reviewed excerpts partial and preserves the real warranty and CMC distinction", () => {
    const d = reviewedScans[1];
    const result = extractSpecifications(
      [{ ...doc(""), url: d.url, pages: d.pages, textMethod: "reviewed-scan" }],
      ["ENDOSCOPY"],
    );
    expect(result.extractionStatus).toBe("partial");
    expect(
      result.sections.warranty.some((i) => i.requirement.includes("2 Year")),
    ).toBe(true);
    expect(
      result.sections.cmc.some((i) => i.requirement.includes("8 Year")),
    ).toBe(true);
    expect(
      result.sections.serviceRequirements.some((i) =>
        i.requirement.includes("98%"),
      ),
    ).toBe(true);
  });
  it("retains explicitly stated cleaning-adaptor package quantity", () => {
    const d = reviewedScans[0];
    const result = extractSpecifications(
      [{ ...doc(""), url: d.url, pages: d.pages, textMethod: "reviewed-scan" }],
      ["ENDOSCOPY"],
    );
    const accessory = result.sections.accessories.find((item) =>
      item.requirement.includes("Package of 10"),
    );
    expect(accessory?.quantity).toBe("10");
    expect(accessory?.sourcePage).toBe(5);
  });
  it("reads visually checked labelled submission times with physical-page provenance", () => {
    const deadlines = reviewedScans.map(
      (d) =>
        extractSubmissionDeadline(d.pages.map((p) => p.text).join("\n"))?.date,
    );
    expect(deadlines).toEqual([
      "2026-10-07T17:00:00+05:30",
      "2026-10-08T14:00:00+05:30",
    ]);
  });
});

it("keeps the GeM reference as a strong ID in the full Bathinda list", () => {
  const html =
    '<table><tr><td>1</td><td>GEM/2026/B/1234567</td><td>ICU ventilator</td><td>24-Sep-2026</td><td>07-Oct-2026</td><td><a href="/v.pdf">Bid document</a></td></tr></table>';
  expect(
    parseInstitution(html, "aiims-bathinda-open", now.toISOString())[0]
      .tenderId,
  ).toBe("GEM/2026/B/1234567");
});

it("reuses only recently retrieved official PDF bytes, with copied buffers and expiry", () => {
  const url = "https://www.aiimsbathinda.edu.in/cache-fixture.pdf";
  const bytes = Buffer.from("%PDF-test");
  rememberDocumentBytes(url, bytes, 1000);
  bytes[5] = 0;
  expect(new TextDecoder().decode(recentDocumentBytes(url, 2000))).toBe(
    "%PDF-test",
  );
  expect(recentDocumentBytes(url, 62000)).toBeUndefined();
  rememberDocumentBytes(
    "https://bad.test/spec.pdf",
    Buffer.from("%PDF-test"),
    1000,
  );
  expect(
    recentDocumentBytes("https://bad.test/spec.pdf", 2000),
  ).toBeUndefined();
});

it("does not erase unrelated clauses when an amendment's field is ambiguous", () => {
  const result = extractSpecifications(
    [
      doc(
        "Technical Specifications\nBattery runtime 2 hours\nBattery charge time 60 minutes",
      ),
      doc("Battery amended: read as 90 minutes", {
        type: "corrigendum",
        publishedDate: "2026-09-30",
      }),
    ],
    ["VENTILATORS"],
  );
  expect(result.sections.technicalRequirements).toHaveLength(3);
  expect(result.extractionStatus).toBe("partial");
  expect(result.notes.join()).toContain("precedence requires official review");
});
