import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourceFetchResult } from "../src/types/tender";

const mocks = vi.hoisted(() => ({ allSources: vi.fn() }));
vi.mock("@/lib/cache/source-cache", () => ({ allSources: mocks.allSources }));
import { GET } from "../src/app/api/diagnostics/route";

afterEach(() => vi.clearAllMocks());

describe("institution diagnostic counts", () => {
  it("agrees with included records when inspected document scope establishes medical items", async () => {
    const checked = new Date().toISOString();
    const source: SourceFetchResult = {
      sourceId: "cppp-pgimer",
      sourceName: "Official PGIMER source",
      status: "SUCCESS",
      attemptedAt: checked,
      successfulAt: checked,
      notes: [],
      durationMs: 1,
      metrics: {
        rawRecords: 1,
        institutionMatches: 0,
        medicalMatches: 0,
        falsePositivesRejected: 0,
        unassignedRejected: 0,
        detailChecks: 1,
      },
      records: [{
        title: "Procurement of ICU equipment",
        institutionId: "pgimer",
        region: "Chandigarh",
        sourceId: "cppp-pgimer",
        sourceName: "Official PGIMER source",
        sourceUrl: "https://eprocure.gov.in/eprocure/app",
        tenderCategory: "Works",
        description: "Item description: ICU ventilator | Quantity: 10",
        documentProductScope: "Item description: ICU ventilator | Quantity: 10",
        fetchedAt: checked,
      }],
    };
    mocks.allSources.mockResolvedValue([source]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary.medicalRelevant).toBe(1);
    expect(body.institutions.find((i: { id: string }) => i.id === "pgimer"))
      .toMatchObject({ institutionMatches: 1, medicalMatches: 1, falsePositivesRejected: 0 });
  });
});
