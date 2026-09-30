import { createNicAdapter } from "./adapters/nic";
import { createBilaspurAdapter } from "./adapters/bilaspur";
import { createInstitutionAdapter } from "./adapters/institution";
import { esicAdapter } from "./adapters/esic";
import type { TenderSourceAdapter } from "@/types/tender";
const pb = [
  "gmc-patiala",
  "gmc-amritsar",
  "ggsmch-faridkot",
  "aims-mohali",
  "sims-hoshiarpur",
  "sims-kapurthala",
  "sangrur-project",
  "sbs-project",
  "malerkotla-project",
];
const hp = [
  "igmc-shimla",
  "aimss-chamiana",
  "rpgmc-tanda",
  "slbsgmch-nerchowk",
  "yspgmc-nahan",
  "jlngmc-chamba",
  "rkgmc-hamirpur",
];
export const adapters: TenderSourceAdapter[] = [
  createInstitutionAdapter("aiims-bathinda"),
  ...(["gem", "cppp", "niq"] as const).map(createBilaspurAdapter),
  createNicAdapter({
    id: "cppp-pgimer",
    name: "CPPP / PGIMER",
    origin: "https://eprocure.gov.in",
    prefix: "/eprocure/app",
    organisation:
      /Postgraduate Institute of Medical (?:and )?Education and Research/i,
    region: "Chandigarh",
    institutionIds: ["pgimer", "pgi-ferozepur"],
  }),
  createNicAdapter({
    id: "punjab-dmer",
    name: "Punjab eProcurement / DMER",
    origin: "https://eproc.punjab.gov.in",
    prefix: "/nicgep/app",
    organisation: /Department of Medical Education and Research/i,
    region: "Punjab",
    institutionIds: pb,
    statewide: true,
  }),
  createNicAdapter({
    id: "punjab-phsc",
    name: "Punjab eProcurement / Health & PHSC",
    origin: "https://eproc.punjab.gov.in",
    prefix: "/nicgep/app",
    organisation: /Department of Health and Family Welfare/i,
    region: "Punjab",
    institutionIds: pb,
    statewide: true,
  }),
  createNicAdapter({
    id: "punjab-pidb",
    name: "Punjab eProcurement / Finance & PIDB",
    origin: "https://eproc.punjab.gov.in",
    prefix: "/nicgep/app",
    organisation: /Department of Finance/i,
    region: "Punjab",
    institutionIds: pb,
  }),
  createNicAdapter({
    id: "chandigarh-eproc",
    name: "Chandigarh eProcurement",
    origin: "https://etenders.chd.nic.in",
    prefix: "/nicgep/app",
    organisation: /Chandigarh Administration/i,
    region: "Chandigarh",
    institutionIds: ["gmch"],
  }),
  createNicAdapter({
    id: "hp-dmer",
    name: "Himachal eProcurement / DMER",
    origin: "https://hptenders.gov.in",
    prefix: "/nicgep/app",
    organisation: /Directorate of Medical Education and Research/i,
    region: "Himachal Pradesh",
    institutionIds: hp,
    statewide: true,
  }),
  createNicAdapter({
    id: "hpmscl",
    name: "Himachal eProcurement / HPMSCL",
    origin: "https://hptenders.gov.in",
    prefix: "/nicgep/app",
    organisation: /Himachal Pradesh Medical Services Corporation/i,
    region: "Himachal Pradesh",
    institutionIds: hp,
    statewide: true,
  }),
  createNicAdapter({
    id: "hp-pwd",
    name: "Himachal eProcurement / PWD",
    origin: "https://hptenders.gov.in",
    prefix: "/nicgep/app",
    organisation: /^PWD$|Public Works Department/i,
    region: "Himachal Pradesh",
    institutionIds: hp,
  }),
  createInstitutionAdapter("bfuhs"),
  createInstitutionAdapter("gmc-patiala"),
  createInstitutionAdapter("gmc-amritsar"),
  createInstitutionAdapter("slbsgmc"),
  esicAdapter,
  {
    id: "gem-direct",
    name: "GeM direct public search",
    url: "https://bidplus.gem.gov.in/all-bids",
    institutionIds: [],
    regions: ["Punjab", "Chandigarh", "Himachal Pradesh"],
    async fetch() {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: "UNAVAILABLE",
        records: [],
        attemptedAt: new Date().toISOString(),
        error:
          "Direct automated GeM search is not a verified reliable public interface. Official institution GeM mirrors are fetched separately.",
        notes: [
          "No authentication or CAPTCHA automation. No guessed GeM API endpoints.",
        ],
        metrics: {
          rawRecords: 0,
          institutionMatches: 0,
          medicalMatches: 0,
          falsePositivesRejected: 0,
          unassignedRejected: 0,
          detailChecks: 0,
        },
        durationMs: 0,
      };
    },
  },
];
export function getAdapter(id: string) {
  return adapters.find((a) => a.id === id);
}
