import { afterEach, describe, expect, it, vi } from "vitest";
import { institutions } from "../src/lib/config/institutions";
import { assignInstitutions, matchInstitutions, groupRawByInstitution } from "../src/lib/tender/institution-matcher";
import { createNicAdapter, resolveNicHealthcareRegion, isGovernmentHealthcareChain } from "../src/lib/sources/adapters/nic";
import { SourceHttp } from "../src/lib/sources/http";
import type { RawTender } from "../src/types/tender";
const raw = (values: Partial<RawTender> = {}): RawTender => ({ title: "ICU ventilator", region: "Punjab", sourceId: "cppp-regional-health", sourceName: "CPPP", sourceUrl: "https://eprocure.gov.in/eprocure/app", fetchedAt: "2026-10-03T12:00:00Z", ...values });
afterEach(() => vi.restoreAllMocks());
describe("regional public healthcare coverage", () => {
  it("indexes institution diagnostics without duplicating multi-institution records", () => {
    const record = raw({ title: "Ventilators", organisation: "Government Medical College Patiala, Government Medical College Amritsar" });
    const grouped = groupRawByInstitution([record]);
    expect(grouped.get("gmc-patiala")).toEqual([record]);
    expect(grouped.get("gmc-amritsar")).toEqual([record]);
    expect(grouped.has("pgimer")).toBe(false);
  });
  it("keeps official named facilities distinct and avoids city-only assignments", () => {
    expect(new Set(institutions.map((i) => i.id)).size).toBe(institutions.length);
    expect(institutions.length).toBeGreaterThan(280);
    expect(matchInstitutions("Delivery Ludhiana Punjab")).toEqual([]);
    expect(matchInstitutions("CHC Gharuan")).toEqual([]);
    expect(matchInstitutions("PHC Gharuan").map((i) => i.id)).toContain("punjab-phc-gharuan");
    expect(matchInstitutions("BFUHS Faridkot").map((i) => i.id)).not.toContain("ggsmch-faridkot");
    expect(institutions.find((i) => i.id === "pgi-una")?.operationalStatus).toBe("developing");
  });
  it.each([["PGIMER Satellite Centre Sangrur", "pgi-sangrur"], ["PGIMER Satellite Centre Una", "pgi-una"], ["Ferozepur", "pgi-ferozepur"]])("attributes parent PGIMER delivery %s to its satellite", (location, id) => {
    expect(assignInstitutions(raw({ sourceId: "cppp-pgimer", region: "Chandigarh", location, organisation: "PGIMER" })).map((i) => i.id)).toEqual([id]);
  });
  it.each([["New Chandigarh 140901", "Punjab"], ["Unknown Government Hospital, Punjab", "Punjab"], ["CHC Sahoo, Himachal Pradesh", "Himachal Pradesh"], ["ESIC Hospital Baddi", "Himachal Pradesh"], ["Government Hospital Chandigarh", "Chandigarh"], ["Chandimandir Haryana", "Haryana"], ["Jammu & Kashmir", "Jammu and Kashmir"], ["Uttarakhand", "Uttarakhand"]])("scopes a public national buyer by %s", (location, region) => {
    expect(resolveNicHealthcareRegion(raw({ location }))).toBe(region);
  });
  it.each(["Bilaspur Chhattisgarh", "Una Gujarat", "Leh Ladakh", "New Delhi", "All India", "Punjab and Himachal Pradesh"])("does not invent one monitored destination for %s", (location) => {
    expect(resolveNicHealthcareRegion(raw({ location, organisation: "ESIC" }))).toBeUndefined();
  });
  it("excludes non-health government departments and government-aided private colleges", () => {
    expect(isGovernmentHealthcareChain(raw({ organisation: "Haryana Government||Public Health Engineering" }))).toBe(false);
    expect(isGovernmentHealthcareChain(raw({ organisation: "Haryana Government||Health||Maharaja Agrasen Medical College" }))).toBe(false);
    expect(isGovernmentHealthcareChain(raw({ organisation: "Haryana Government||Health||Civil Surgeon Hisar" }))).toBe(true);
  });
  it("uses exposed public page links and retains a national tender only after region evidence", async () => {
    const row = (id: string, title: string) => `<tr><td>1</td><td>01-Oct-2026 10:00 AM</td><td>15-Oct-2026 02:00 PM</td><td>16-Oct-2026 02:00 PM</td><td><a href='/eprocure/app?page=FrontEndViewTender&amp;sp=${id}'>[${title}]</a>[ref][${id}]</td><td>Tata Memorial Centre</td></tr>`;
    const first = "2026_TMC_925000_1", second = "2026_TMC_925001_1";
    const seen: string[] = [];
    vi.spyOn(SourceHttp.prototype, "text").mockImplementation(async (url) => {
      seen.push(url);
      if (url.includes("FrontEndTendersByOrganisation")) return "Tenders by Organisation<table></table>";
      if (url.includes("TablePages.linkPage")) return `S.No<table>${row(second, "Defibrillator")}</table>`;
      if (url.includes("FrontEndLatestActiveTendersOrgwise")) return `S.No<table>${row(first, "ICU ventilator")}</table><a href='/eprocure/app?component=%24TablePages.linkPage&amp;page=FrontEndLatestActiveTendersOrgwise&amp;service=direct&amp;sp=2'>2</a>`;
      const id = url.includes(second) ? second : first;
      return `<table><tr><td>Tender ID</td><td>${id}</td></tr><tr><td>Location</td><td>${id === second ? "New Chandigarh Punjab" : "Mumbai Maharashtra"}</td></tr></table>`;
    });
    const result = await createNicAdapter({ id: "cppp-regional-health", name: "CPPP", origin: "https://eprocure.gov.in", prefix: "/eprocure/app", organisation: /^Tata Memorial Centre$/, publicOrganisations: ["Tata Memorial Centre"], region: "Punjab", institutionIds: [], regionalHealthcare: true }).fetch();
    expect(result.records.map((r) => r.tenderId)).toEqual([second]);
    expect(result.records[0].region).toBe("Punjab");
    expect(result.records[0].verification).toBe("detail");
    expect(seen.some((u) => u.includes("TablePages.linkPage"))).toBe(true);
  });
});
