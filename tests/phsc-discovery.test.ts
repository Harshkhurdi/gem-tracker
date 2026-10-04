import { describe, expect, it } from "vitest";
import type { RawTender } from "../src/types/tender";
import { isPhscBuyer, phscOpaqueCandidate } from "../src/lib/config/phsc-discovery";

const raw = (values: Partial<RawTender> = {}): RawTender => ({
  title: "PHSC/Proc/ERS108/2026/168",
  sourceId: "punjab-phsc", sourceName: "PHSC", region: "Punjab",
  sourceUrl: "https://eproc.punjab.gov.in/nicgep/app",
  organisationChain: ["Department of Health and Family Welfare", "Punjab Health System Corporation", "Medical Wing"],
  fetchedAt: "2026-10-04T10:00:00Z", ...values,
});

describe("PHSC opaque scope inspection", () => {
  it.each(["PHSC/Proc/ERS108/2026/168", "e-tender/PHSC/Proc/2026/168", "Various items", "Medical equipment", "Supply of Equipment, Instruments for BLS Ambulances", "Equipment for ALS Ambulance", "CMC", "AMC of medical equipment", "CAMC"])("schedules the exact public buyer's %s", (title) => {
    expect(phscOpaqueCandidate(raw({ title }))).toBe(true);
  });

  it("supports the full organisation field and plural official spelling", () => {
    expect(isPhscBuyer(raw({ organisationChain: undefined, organisation: "Department of Health and Family Welfare||Punjab Health Systems Corporation||Medical Wing" }))).toBe(true);
  });

  it.each([
    { sourceId: "punjab-dmer" }, { region: "Haryana" as const },
    { organisationChain: ["PHSC", "Medical Wing"] },
    { organisationChain: ["Private Punjab Health System Corporation", "Medical Wing"] },
    { organisationChain: ["Punjab Health System Corporation", "Private Trust", "Medical Wing"] },
    { organisationChain: ["Punjab Health System Corporation", "Engineering Wing"] },
    { organisationChain: ["Punjab Health System Corporation"] },
  ])("rejects an unverified or out of scope buyer %j", (values) => {
    expect(phscOpaqueCandidate(raw(values))).toBe(false);
  });

  it.each(["Hospital Consumables", "Rate contract for drugs", "Medicines", "Medical equipment manpower", "Various items for civil construction", "Equipment for engineering works", "Ventilator", "Ultrasound machine", "Defibrillator"])("does not route an explicit product or excluded scope %s through opaque inspection", (title) => {
    expect(phscOpaqueCandidate(raw({ title }))).toBe(false);
  });

  it.each(["Supply of hospital consumables", "Procurement of RUP syringes", "Construction of hospital building", "Rate contract for medicine", "Manpower recruitment"])("rejects an opaque reference with excluded declared scope %s", (description) => {
    expect(phscOpaqueCandidate(raw({ description }))).toBe(false);
  });

  it("does not promote a portal medical category into inspection evidence", () => {
    expect(phscOpaqueCandidate(raw({ title: "Unrelated tender", productCategory: "Medical Equipments/Waste" }))).toBe(false);
  });

  it("leaves recency and status gating to the scheduling caller", () => {
    expect(phscOpaqueCandidate(raw({ originalClosingDate: "2024-01-01T12:00:00+05:30", cancelled: true }))).toBe(true);
  });
});
