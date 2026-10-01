import { describe, expect, it } from "vitest";
import type { Brand, Tender } from "../src/types/tender";
import { classifyMedical, matchBrands } from "../src/lib/tender/classifier";
import { BRAND_PORTFOLIOS } from "../src/lib/config/brand-portfolios";
import { closingDeadlineTimestamp } from "../src/lib/tender/dates";
import { resolveStatus } from "../src/lib/tender/status";
import {
  filterAndSortTenders,
  refreshElapsedStatuses,
  daysUntilClosing,
  type DashboardFilters,
} from "../src/lib/tender/dashboard-filter";
const now = Date.parse("2026-10-01T10:00:00+05:30");
const filters: DashboardFilters = {
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
function tender(title: string, closing = "2026-10-07"): Tender {
  const medical = classifyMedical(title);
  return {
    id: title,
    title,
    region: "Punjab",
    sourceId: "test",
    sourceName: "test",
    sourceUrl: "https://example.com",
    fetchedAt: "2026-10-01T09:00:00+05:30",
    checkedAt: "2026-10-01T09:00:00+05:30",
    effectiveClosingDate: closing,
    originalClosingDate: closing,
    status: "ACTIVE_VERIFIED",
    verification: "detail",
    procurementScope: "institution",
    categories: medical.categories,
    brandMatches: matchBrands(title, medical.categories),
    matchedKeywords: medical.matchedKeywords,
    confidence: medical.confidence,
  };
}
const cases: [Brand, string][] = [
  ["Samsung Healthcare", "echocardiography ultrasound machine"],
  ["Hamilton Medical", "ICU ventilator"],
  ["KARL STORZ", "electrocautery unit"],
  ["LINET", "hospital bed"],
  ["Medcaptain", "coagulation analyzer"],
  ["Spacelabs Healthcare", "Holter system"],
  ["Skanray", "defibrillator"],
];
describe("actual dashboard portfolio selection and sorting", () => {
  it.each(cases)("selects clinical scope for %s", (brand, title) => {
    const result = filterAndSortTenders(
      [tender(title), tender("laboratory microscope")],
      { ...filters, brand },
      now,
    );
    expect(result.map((t) => t.title)).toEqual([title]);
    expect(result[0].brandMatches).toContainEqual(
      expect.objectContaining({ brand, matchType: "portfolio" }),
    );
  });
  it("puts all seven portfolios ahead of other medical tenders, and toggle restores deadline order", () => {
    expect(cases.map(([brand]) => brand)).toEqual(
      BRAND_PORTFOLIOS.map((p) => p.brand),
    );
    const other = tender("laboratory microscope", "2026-10-02");
    const portfolios = cases.map(([, title], index) =>
      tender(title, `2026-10-${10 + index}`),
    );
    const data = [other, ...portfolios.slice().reverse()];
    expect(filterAndSortTenders(data, filters, now).map((t) => t.id)).toEqual(
      [...portfolios, other].map((t) => t.id),
    );
    expect(
      filterAndSortTenders(data, { ...filters, prioritize: false }, now)[0].id,
    ).toBe(other.id);
  });
  it("does not impose a brand ranking within the priority group", () => {
    const samsung = tender("Samsung ultrasound", "2026-10-05");
    const hamilton = tender("Hamilton ventilator", "2026-10-02");
    expect(
      filterAndSortTenders([samsung, hamilton], filters, now).map((t) => t.id),
    ).toEqual([hamilton.id, samsung.id]);
  });
  it("requires explicit evidence for the selected brand even when another brand is explicit", () => {
    const mixed = tender("Hamilton ventilator and ultrasound equipment");
    expect(
      filterAndSortTenders(
        [mixed],
        { ...filters, brand: "Samsung Healthcare", explicit: true },
        now,
      ),
    ).toEqual([]);
    expect(
      filterAndSortTenders(
        [mixed],
        { ...filters, brand: "Hamilton Medical", explicit: true },
        now,
      ),
    ).toEqual([mixed]);
    expect(
      filterAndSortTenders([mixed], { ...filters, explicit: true }, now),
    ).toEqual([mixed]);
  });
  it.each(cases)("finds explicit brand evidence for %s", (brand, title) => {
    const explicit = tender(`${brand} ${title}`);
    const portfolio = tender(title);
    expect(
      filterAndSortTenders(
        [portfolio, explicit],
        { ...filters, brand, explicit: true },
        now,
      ),
    ).toEqual([explicit]);
  });
  it("keeps institution consignees and other filter constraints working together", () => {
    const t = {
      ...tender("Samsung ultrasound"),
      consignees: [{ name: "Hospital", institutionId: "hospital" }],
    };
    expect(
      filterAndSortTenders(
        [t],
        {
          ...filters,
          institution: "hospital",
          query: "Samsung",
          region: "Punjab",
          category: "ULTRASOUND",
          source: "test",
          closing: "7",
        },
        now,
      ),
    ).toEqual([t]);
    expect(
      filterAndSortTenders([t], { ...filters, region: "Chandigarh" }, now),
    ).toEqual([]);
  });
  it("finds a deduplicated row by its contributing source", () => {
    const t = {
      ...tender("Samsung ultrasound"),
      sourceReferences: [
        {
          sourceId: "secondary",
          sourceName: "Another source",
          url: "https://example.com/bid",
        },
      ],
    };
    expect(
      filterAndSortTenders([t], { ...filters, source: "secondary" }, now),
    ).toEqual([t]);
    expect(
      filterAndSortTenders([t], { ...filters, source: "unrelated" }, now),
    ).toEqual([]);
  });
});
describe("multi-institution text search", () => {
  it("finds an institution named only in the consignee list", () => {
    const record = {
      ...tender("Digital radiography equipment"),
      consignees: [{ name: "Dr RPGMC Tanda", institutionId: "rpgmc-tanda" }],
    };
    expect(
      filterAndSortTenders([record], { ...filters, query: "RPGMC Tanda" }, now),
    ).toEqual([record]);
  });
});

describe("deadline and client freshness transitions", () => {
  it("keeps date-only deadlines active for the entire IST closing date", () => {
    const t = tender("Samsung ultrasound", "2026-10-01");
    const finalMillisecond = Date.parse("2026-10-01T23:59:59.999+05:30");
    expect(closingDeadlineTimestamp(t.effectiveClosingDate)).toBe(
      finalMillisecond,
    );
    expect(resolveStatus(t, new Date(finalMillisecond)).status).toBe(
      "ACTIVE_VERIFIED",
    );
    expect(refreshElapsedStatuses([t], finalMillisecond)[0].status).toBe(
      "ACTIVE_VERIFIED",
    );
    expect(refreshElapsedStatuses([t], finalMillisecond + 1)[0].status).toBe(
      "EXPIRED",
    );
    expect(daysUntilClosing(t.effectiveClosingDate, now)).toBe(0);
  });
  it("downgrades verification across IST midnight without a network reload", () => {
    const t = {
      ...tender("Samsung ultrasound"),
      fetchedAt: "2026-10-01T23:58:00+05:30",
    };
    expect(
      refreshElapsedStatuses([t], Date.parse("2026-10-01T23:59:00+05:30"))[0]
        .status,
    ).toBe("ACTIVE_VERIFIED");
    expect(
      refreshElapsedStatuses([t], Date.parse("2026-10-02T00:00:00+05:30"))[0]
        .status,
    ).toBe("ACTIVE_LIKELY");
    expect(t.status).toBe("ACTIVE_VERIFIED");
  });
  it("downgrades stale evidence without reviving terminal statuses", () => {
    const t = { ...tender("Samsung ultrasound"), stale: true };
    expect(refreshElapsedStatuses([t], now)[0].status).toBe("ACTIVE_LIKELY");
    expect(
      refreshElapsedStatuses([{ ...t, status: "CANCELLED" }], now)[0].status,
    ).toBe("CANCELLED");
  });
});
