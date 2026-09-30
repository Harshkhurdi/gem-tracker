import { describe, it, expect } from "vitest";
import {
  matchInstitutions,
  assignInstitutions,
} from "@/lib/tender/institution-matcher";
import { parseIndianDate } from "@/lib/tender/dates";
import { officialUrl } from "@/lib/sources/http";
import type { RawTender } from "@/types/tender";
describe("Institution aliases and central consignees", () => {
  for (const [text, id] of [
    ["IGMC Shimla Principal", "igmc-shimla"],
    ["MS IGH Shimla", "igmc-shimla"],
    ["Ner Chowk Medical College", "slbsgmch-nerchowk"],
    [
      "Procurement of Digital Mammography Machine for Pt. JLNGMC Chamba",
      "jlngmc-chamba",
    ],
    [
      "Dr. Radha Krishan Government Medical College Hamirpur MS Office",
      "rkgmc-hamirpur",
    ],
  ])
    it(text, () =>
      expect(matchInstitutions(text).map((i) => i.id)).toContain(id),
    );
  it("does not assign HPMSCL head office in Shimla to IGMC", () =>
    expect(
      assignInstitutions({
        title: "Digital Radiography Machine",
        region: "Himachal Pradesh",
        sourceId: "hpmscl",
        sourceName: "HPMSCL",
        sourceUrl: "https://hptenders.gov.in",
        organisation: "HPMSCL",
        location: "Shimla",
        fetchedAt: new Date().toISOString(),
      }),
    ).toEqual([]));
  it("keeps both explicit PET/CT consignees", () => {
    const raw: RawTender = {
      title: "PET/CT Scanner",
      region: "Himachal Pradesh",
      sourceId: "hpmscl",
      sourceName: "HPMSCL",
      sourceUrl: "https://hptenders.gov.in",
      organisation: "HPMSCL",
      location: "RKGMC Hamirpur, RPGMC Tanda",
      fetchedAt: new Date().toISOString(),
    };
    expect(
      assignInstitutions(raw)
        .map((i) => i.id)
        .sort(),
    ).toEqual(["rkgmc-hamirpur", "rpgmc-tanda"]);
  });
  it("PGIMER Ferozepur does not become a Chandigarh hospital", () =>
    expect(
      assignInstitutions({
        title: "Equipment for Satellite Centre Ferozepur",
        region: "Chandigarh",
        sourceId: "cppp-pgimer",
        sourceName: "CPPP",
        sourceUrl: "https://eprocure.gov.in",
        organisation: "PGIMER",
        fetchedAt: new Date().toISOString(),
      }).map((i) => i.id),
    ).toEqual(["pgi-ferozepur"]));
});
describe("IST dates", () => {
  it("converts 12AM and 12PM correctly", () => {
    expect(parseIndianDate("01-Oct-2026 12:00 AM")).toBe(
      "2026-10-01T00:00:00+05:30",
    );
    expect(parseIndianDate("01-Oct-2026 12:00 PM")).toBe(
      "2026-10-01T12:00:00+05:30",
    );
  });
  it("rejects nonexistent calendar dates", () => {
    expect(parseIndianDate("31-Feb-2026")).toBeUndefined();
    expect(parseIndianDate("29-Feb-2028")).toBeTruthy();
  });
  it("date-only deadline is conservatively end of IST day", () =>
    expect(parseIndianDate("14-10-2026", true)).toBe(
      "2026-10-14T23:59:59+05:30",
    ));
});
describe("official URL boundaries", () => {
  it("rejects private and misleading hosts", () => {
    for (const url of [
      "http://localhost:3000",
      "https://aiimsbilaspur.edu.in.evil.com/a.pdf",
      "file:///etc/passwd",
      "https://127.0.0.1/",
    ])
      expect(officialUrl(url)).toBeUndefined();
  });
  it("accepts actual institution PDF links", () =>
    expect(officialUrl("/x.pdf", "https://www.aiimsbilaspur.edu.in")).toBe(
      "https://www.aiimsbilaspur.edu.in/x.pdf",
    ));
});
