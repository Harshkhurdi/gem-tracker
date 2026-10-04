import { gemPriorityAdapter } from "./adapters/gem-priority";
import { regions } from "../config/regions";
import { processPrioritySource, linkRetenders } from "../specification/enrich";
import { createGemAdapter } from "./adapters/gem";
import { pgimerAdapter } from "./adapters/pgimer";
import { createNicAdapter } from "./adapters/nic";
import { createBilaspurAdapter } from "./adapters/bilaspur";
import { createInstitutionAdapter } from "./adapters/institution";
import { esicAdapter, cpppEsicAdapter } from "./adapters/esic";
import type { TenderSourceAdapter } from "@/types/tender";
import { institutions } from "../config/institutions";
const pb = institutions.filter((i) => i.region === "Punjab").map((i) => i.id);
const hp = institutions.filter((i) => i.region === "Himachal Pradesh").map((i) => i.id);
const baseAdapters: TenderSourceAdapter[] = [
  pgimerAdapter,
  createInstitutionAdapter("aiims-bathinda"),
  createInstitutionAdapter("aiims-bathinda-open"),
  createNicAdapter({
    id: "cppp-aiims-bathinda",
    name: "CPPP / AIIMS Bathinda",
    origin: "https://eprocure.gov.in",
    prefix: "/eprocure/app",
    organisation: /All India Institute of Medical Sciences Bathinda/i,
    region: "Punjab",
    institutionIds: ["aiims-bathinda"],
  }),
  createNicAdapter({
    id: "cppp-aiims-bilaspur",
    name: "CPPP / AIIMS Bilaspur",
    origin: "https://eprocure.gov.in",
    prefix: "/eprocure/app",
    organisation: /All India Institute of Medical Sciences Bilaspur/i,
    region: "Himachal Pradesh",
    institutionIds: ["aiims-bilaspur"],
  }),
  createNicAdapter({
    id: "hp-health",
    name: "Himachal eProcurement / Health & Family Welfare",
    origin: "https://hptenders.gov.in",
    prefix: "/nicgep/app",
    organisation: /Department of Health and Family Welfare/i,
    region: "Himachal Pradesh",
    institutionIds: hp,
    statewide: true,
  }),
  ...(["gem", "cppp", "niq"] as const).map(createBilaspurAdapter),
  createNicAdapter({
    id: "cppp-pgimer",
    name: "CPPP / PGIMER",
    origin: "https://eprocure.gov.in",
    prefix: "/eprocure/app",
    organisation:
      /Postgraduate Institute of Medical (?:and )?Education and Research/i,
    region: "Chandigarh",
    institutionIds: ["pgimer", "pgi-ferozepur", "pgi-sangrur", "pgi-una"],
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
    institutionIds: institutions.filter((i) => i.region === "Chandigarh").map((i) => i.id),
    statewide: true,
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
  ...([
    { id: "jk-health", name: "J&K eProcurement / government healthcare", origin: "https://jktenders.gov.in", region: "Jammu and Kashmir", organisation: /Health and Medical Education|^SKIMS$/i },
    { id: "uk-health", name: "Uttarakhand eProcurement / government healthcare", origin: "https://uktenders.gov.in", region: "Uttarakhand", organisation: /National Health Mission|NHM|Health and Family Welfare|Medical Health|Medical College|Chandra Singh Garhwali.*Medical/i },
    { id: "haryana-health", name: "Haryana eProcurement / government healthcare", origin: "https://etenders.hry.nic.in", region: "Haryana", organisation: /^Haryana Government$/i },
  ] as const).map((source) => createNicAdapter({ ...source, prefix: "/nicgep/app",
    institutionIds: institutions.filter((i) => i.region === source.region).map((i) => i.id),
    statewide: true, healthcareOnly: true, detailLimit: 40, pageLimit: 100, budgetMs: 75000,
  })),
  createNicAdapter({
    id: "cppp-regional-health",
    publicOrganisations: ["Tata Memorial Centre"],
    name: "CPPP / regional government healthcare",
    origin: "https://eprocure.gov.in", prefix: "/eprocure/app",
    organisation: /^(?:Central Medical Services Society|Directorate General (?:of )?Health Services.*|Tata Memorial Cent(?:er|re)|Central Research Institute.*|National Institute of Pharmaceutical Education.*|All India Institute of Medical Sciences(?:-| )(?:Rishikesh|Vijaypur Jammu|Jammu).*|Sher.*Kashmir.*Medical.*|Post.*Medical.*Rohtak.*)$/i,
    region: "Punjab", institutionIds: institutions.map((i) => i.id),
    regionalHealthcare: true, detailLimit: 64, budgetMs: 75000,
  }),
  createNicAdapter({
    id: "etenders-hll", name: "Central eTender / HLL regional healthcare",
    origin: "https://etenders.gov.in", prefix: "/eprocure/app",
    organisation: /^HLL Lifecare Limited$/i,
    region: "Punjab", institutionIds: institutions.map((i) => i.id),
    regionalHealthcare: true, detailLimit: 64, budgetMs: 75000,
  }),
  esicAdapter,
  cpppEsicAdapter,
  gemPriorityAdapter,
  ...regions.map(createGemAdapter),
];
export const adapters: TenderSourceAdapter[] = baseAdapters.map((adapter) => ({
  ...adapter,
  async fetch() {
    const result = await adapter.fetch();
    const processed = await processPrioritySource(result);
    linkRetenders(processed.records);
    return processed;
  },
}));
export function getAdapter(id: string) {
  return adapters.find((a) => a.id === id);
}
