import type {
  PriorityEquipment,
  TenderSpecification,
  PriorityDiscoveryMetrics,
} from "./specification";
import type { Region } from "@/lib/config/regions";
export type { Region } from "@/lib/config/regions";
export type TenderStatus =
  | "ACTIVE_VERIFIED"
  | "ACTIVE_LIKELY"
  | "DEADLINE_UNKNOWN"
  | "EXPIRED"
  | "CANCELLED"
  | "WITHDRAWN";
export type ProcurementScope =
  "institution" | "multi-institution" | "statewide";
export type MedicalCategory =
  | "DIAGNOSTIC_IMAGING"
  | "ULTRASOUND"
  | "XRAY_DR"
  | "C_ARM"
  | "CT"
  | "PATIENT_MONITORING"
  | "VENTILATION"
  | "RESPIRATORY"
  | "PATIENT_WARMING"
  | "OT_LIGHTS"
  | "ANAESTHESIA"
  | "INFUSION"
  | "ENDOSCOPY"
  | "LAPAROSCOPY"
  | "ARTHROSCOPY"
  | "BRONCHOSCOPY"
  | "UROLOGY_ENDOSCOPY"
  | "ENT_AIRWAY"
  | "SURGICAL_INSTRUMENTS"
  | "ELECTROSURGERY"
  | "HOSPITAL_BEDS"
  | "STRETCHERS"
  | "PRESSURE_CARE"
  | "CARDIOLOGY_DIAGNOSTICS"
  | "ECG"
  | "HOLTER"
  | "ABPM"
  | "DEFIBRILLATION"
  | "LAB_IVD"
  | "COAGULATION"
  | "MEDICAL_FURNITURE"
  | "CONSUMABLES"
  | "ACCESSORIES"
  | "MEDICAL_IT"
  | "OTHER_MEDICAL_EQUIPMENT";
export type Brand =
  | "Samsung Healthcare"
  | "Hamilton Medical"
  | "KARL STORZ"
  | "LINET"
  | "Medcaptain"
  | "Spacelabs Healthcare"
  | "Skanray";
export interface BrandMatch {
  brand: Brand;
  matchType: "explicit-brand" | "explicit-model" | "portfolio";
  matchedTerms: string[];
}
export interface Institution {
  id: string;
  name: string;
  shortName: string;
  region: Region;
  city: string;
  aliases: string[];
  institutionType:
    | "central-government"
    | "state-government"
    | "government-project"
    | "government-ppp-project";
  operationalStatus: "operational" | "developing" | "project-stage";
  sourceIds: string[];
  officialUrl: string;
  verificationUrl?: string;
  note?: string;
}
export interface Corrigendum {
  title?: string;
  type?: string;
  publishedDate?: string;
  revisedClosingDate?: string;
  url?: string;
}
export interface SourceReference {
  sourceId?: string;
  sourceName: string;
  url: string;
}
/** Official procurement categories, kept separately from inferred medical categories. */
export interface ProcurementCategories {
  tenderCategory?: string;
  productCategory?: string;
  procurementCategory?: string;
  workCategory?: string;
}
/** Explicit source-declared equipment lines, kept separate from category inference. */
export interface TenderEquipmentItem {
  id?: string;
  name: string;
  quantity?: number | string | null;
  category?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourcePage?: number;
  sourceSheet?: string;
  sourceRow?: number;
}
export interface RawTender extends ProcurementCategories {
  equipmentItems?: TenderEquipmentItem[];
  id?: string;
  title: string;
  description?: string;
  region: Region;
  institutionId?: string;
  procurementScope?: ProcurementScope;
  consignees?: { institutionId?: string; name: string }[];
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  tenderUrl?: string;
  tenderId?: string;
  referenceNumber?: string;
  organisation?: string;
  organisationChain?: string[];
  department?: string;
  buyer?: string;
  location?: string;
  publishDate?: string;
  originalClosingDate?: string;
  extendedClosingDate?: string;
  bidOpeningDate?: string;
  cancelled?: boolean;
  withdrawn?: boolean;
  corrigenda?: Corrigendum[];
  documents?: { label: string; url: string }[];
  sourceReferences?: SourceReference[];
  verification?: "detail" | "listing";
  datePrecision?: "day" | "minute";
  notes?: string[];
  priorityCategories?: PriorityEquipment[];
  /** Declared items from an inspected official BOQ/technical section, never buyer context. */
  documentProductScope?: string;
  specification?: TenderSpecification;
  fetchedAt: string;
  /** Retained individual record omitted from an incomplete source refresh. */
  stale?: boolean;
}
export interface Tender extends RawTender {
  id: string;
  procurementScope: ProcurementScope;
  institutionName?: string;
  effectiveClosingDate?: string;
  status: TenderStatus;
  categories: MedicalCategory[];
  brandMatches: BrandMatch[];
  matchedKeywords: string[];
  confidence: number;
  checkedAt: string;
  stale?: boolean;
}
export interface SourceMetrics {
  rawRecords: number;
  institutionMatches: number;
  medicalMatches: number;
  falsePositivesRejected: number;
  unassignedRejected: number;
  detailChecks: number;
}
export interface SourceFetchResult {
  sourceId: string;
  sourceName: string;
  status: "SUCCESS" | "PARTIAL" | "UNAVAILABLE";
  records: RawTender[];
  attemptedAt: string;
  successfulAt?: string;
  error?: string;
  notes: string[];
  metrics: SourceMetrics;
  priorityDiscovery?: PriorityDiscoveryMetrics;
  durationMs: number;
  stale?: boolean;
}
export interface TenderSourceAdapter {
  id: string;
  name: string;
  url: string;
  institutionIds: string[];
  regions: Region[];
  fetch(): Promise<SourceFetchResult>;
}
export interface DashboardData {
  tenders: Tender[];
  sources: Omit<SourceFetchResult, "records">[];
  institutions: Institution[];
  lastRefreshed: string | null;
  generatedAt: string;
  summary: {
    rawRecords: number;
    institutionMatched: number;
    medicalRelevant: number;
    activeVerified: number;
    activeLikely: number;
    deadlineUnknown: number;
    expired: number;
    cancelled: number;
    falsePositivesRejected: number;
    unassignedRejected: number;
    duplicatesRemoved: number;
  };
  refreshEnabled: boolean;
}
