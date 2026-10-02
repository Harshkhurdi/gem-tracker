export type PriorityEquipment =
  | "VENTILATORS"
  | "ULTRASOUND"
  | "DEFIBRILLATORS"
  | "HOSPITAL_BEDS"
  | "ENDOSCOPY"
  | "MAMMOGRAPHY"
  | "DIGITAL_RADIOGRAPHY"
  | "C_ARM"
  | "INFUSION_PUMPS"
  | "PATIENT_MONITORS"
  | "PATIENT_WARMING"
  | "OT_LIGHTS"
  | "ANAESTHESIA";
export type SpecificationSection =
  | "technicalRequirements"
  | "accessories"
  | "consumables"
  | "serviceRequirements"
  | "warranty"
  | "cmc"
  | "regulatoryRequirements"
  | "bidderEligibility"
  | "delivery"
  | "commercialTerms"
  | "quantity";
export interface SpecificationItem {
  field: string;
  requirement: string;
  value?: string;
  quantity?: string;
  mandatory: boolean | "unknown";
  sourceDocument: string;
  sourceLabel: string;
  sourcePage?: number;
  sourceSheet?: string;
  sourceRow?: number;
  confidence: "high" | "medium" | "low";
  supersededBy?: string;
}
export interface SpecificationDocument {
  label: string;
  url: string;
  type:
    | "technical-specification"
    | "boq"
    | "tender-document"
    | "corrigendum"
    | "other";
  status: "parsed" | "scanned" | "unavailable" | "deferred";
  sha256?: string;
  textMethod?: "pdf-text" | "spreadsheet" | "reviewed-scan";
  pageCount?: number;
  publishedDate?: string;
  note?: string;
}
export interface DocumentPage {
  text: string;
  page?: number;
  sheet?: string;
  row?: number;
}
export interface ParsedDocument extends SpecificationDocument {
  pages: DocumentPage[];
  productText: string;
  links?: { label: string; url: string }[];
}
export interface TenderSpecification {
  extractionStatus:
    "complete" | "partial" | "document-unavailable" | "not-processed";
  equipmentTypes: PriorityEquipment[];
  sections: Record<SpecificationSection, SpecificationItem[]>;
  documentSources: SpecificationDocument[];
  extractedAt?: string;
  notes: string[];
  supersededRequirements: SpecificationItem[];
}
export interface PriorityDiscoveryMetrics {
  rawCandidates: Partial<Record<PriorityEquipment, number>>;
  genericCandidates: number;
  inspectedCandidates: number;
  rejectedCandidates: number;
  deferredCandidates: number;
}
