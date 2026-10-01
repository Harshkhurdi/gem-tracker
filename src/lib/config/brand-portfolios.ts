import type { Brand, MedicalCategory } from "../../types/tender";
export interface BrandPortfolio {
  brand: Brand;
  aliases: RegExp;
  models: RegExp;
  categories: MedicalCategory[];
  clinicalTerms?: RegExp;
  /** Common words require a matching clinical category before claiming a model. */
  ambiguousModels?: RegExp;
}
export const BRAND_PORTFOLIOS: BrandPortfolio[] = [
  {
    brand: "Samsung Healthcare",
    aliases: /\b(?:samsung(?: healthcare| medison)?)\b/i,
    models:
      /\b(?:R20|GM85(?: Fit)?|GC85|GF85|BodyTom|OmniTom|S[ -]Hub|SMART Center)\b/i,
    ambiguousModels: /^(?:R20|SMART Center)$/i,
    categories: ["ULTRASOUND", "XRAY_DR", "CT"],
  },
  {
    brand: "Hamilton Medical",
    aliases: /\bhamilton(?: medical)?\b/i,
    models: /\b(?:HAMILTON[ -](?:C6|C3|C1|T1|MR1|EM7|HF90)|H900)\b/i,
    categories: ["VENTILATION", "RESPIRATORY"],
    clinicalTerms:
      /\b(?:hfnc|high[ -]flow nasal|heated humidifiers?|niv masks?|flow sensors?|expiratory valves?|hmef|nasal cannulas?|ventilator circuits?|breathing circuits?|respiratory circuits?)\b/i,
  },
  {
    brand: "KARL STORZ",
    aliases: /\b(?:karl[ -]?storz|storz)\b/i,
    models:
      /\b(?:C[ -]MAC|HOPKINS|Rubina|IMAGE\s?1(?: S)?|TELE PACK|TELECAM|VITOM|AUTOCON|ENDOMAT|OR1)\b/i,
    ambiguousModels: /^(?:HOPKINS|Rubina|IMAGE\s?1(?: S)?|OR1)$/i,
    categories: [
      "ENDOSCOPY",
      "LAPAROSCOPY",
      "ARTHROSCOPY",
      "BRONCHOSCOPY",
      "UROLOGY_ENDOSCOPY",
      "ENT_AIRWAY",
      "SURGICAL_INSTRUMENTS",
      "ELECTROSURGERY",
    ],
  },
  {
    brand: "LINET",
    aliases: /\blinet\b/i,
    models:
      /\b(?:Multicare(?: X)?|Eleganza|Essenza|Sprint|AVE 2|TOM 2|Air2Care|Virtuoso|OptiCare|HybriMatt|SafeSense)\b/i,
    ambiguousModels: /^(?:Sprint|Virtuoso|OptiCare|SafeSense)$/i,
    categories: [
      "HOSPITAL_BEDS",
      "STRETCHERS",
      "PRESSURE_CARE",
      "MEDICAL_FURNITURE",
    ],
    clinicalTerms:
      /\b(?:bedside cabinets?|patient transport trolleys?|medical trolleys?|patient chairs?|dialysis chairs?|blood donor chairs?|clinical chairs?|treatment chairs?|examination chairs?|hospital furniture)\b/i,
  },
  {
    brand: "Medcaptain",
    aliases: /\bmedcaptain\b/i,
    models: /(?!) /,
    categories: [
      "INFUSION",
      "ANAESTHESIA",
      "ENT_AIRWAY",
      "COAGULATION",
      "BRONCHOSCOPY",
    ],
    clinicalTerms:
      /\b(?:infusion sets?|(?:dvt|vte) pumps?|spirometers?|closed[ -]suction catheters?|blood[ -]grouping(?: analy[sz]ers?)?)\b/i,
  },
  {
    brand: "Spacelabs Healthcare",
    aliases: /\bspace ?labs(?: healthcare)?\b/i,
    models:
      /\b(?:Xprezzon|Qube(?: Mini)?|AriaTele|Xhibit|Sentinel|OnTrak|Eclipse|Evo|Lifecard|CardioPulse|CardioExpress)\b/i,
    ambiguousModels: /^(?:Qube(?: Mini)?|Sentinel|Eclipse|Evo)$/i,
    categories: [
      "PATIENT_MONITORING",
      "ECG",
      "HOLTER",
      "ABPM",
      "CARDIOLOGY_DIAGNOSTICS",
    ],
  },
  {
    brand: "Skanray",
    aliases: /\bskan[ -]?ray\b/i,
    models:
      /\b(?:Tru[ -]?SKAN(?: i10| i12)?|Athena(?: 500i| SV200)?|SkanSiesta Pro|Flo[ -]?Skan)\b/i,
    ambiguousModels: /^Athena$/i,
    categories: [
      "VENTILATION",
      "XRAY_DR",
      "C_ARM",
      "PATIENT_MONITORING",
      "ANAESTHESIA",
      "ECG",
      "DEFIBRILLATION",
      "ELECTROSURGERY",
      "INFUSION",
    ],
  },
];
