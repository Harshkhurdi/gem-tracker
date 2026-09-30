import type { MedicalCategory } from "../../types/tender";

export interface MedicalRule {
  category: MedicalCategory;
  pattern: RegExp;
}
// Every rule names equipment or its clinical use. Institution names alone are not evidence.
export const MEDICAL_RULES: MedicalRule[] = [
  {
    category: "ULTRASOUND",
    pattern:
      /\b(?:ultra\s?sound|ultrasonograph\w*|usg|doppler|sonograph\w*)\b/i,
  },
  {
    category: "XRAY_DR",
    pattern:
      /\b(?:x[ -]?ray|digital radiograph\w*|radiography|radiographic|dr system|computed radiography)\b/i,
  },
  { category: "C_ARM", pattern: /\bc[ -]?arm\b/i },
  {
    category: "CT",
    pattern:
      /\b(?:ct scanner|ct scan|computed tomography|computerized tomography|multislice ct|\d+ ?slice ct)\b/i,
  },
  {
    category: "DIAGNOSTIC_IMAGING",
    pattern:
      /\b(?:mri|magnetic resonance|mammograph\w*|pet[ -]ct|medical imaging)\b/i,
  },
  {
    category: "PATIENT_MONITORING",
    pattern:
      /\b(?:patient monitor\w*|multiparameter monitor\w*|multi[ -]parameter monitor\w*|central (?:monitoring|nursing) station|telemetry|bedside monitor\w*|fetal monitor\w*|foetal monitor\w*|pulse oximeter\w*|capnograph\w*)\b/i,
  },
  {
    category: "VENTILATION",
    pattern: /\b(?:ventilator\w*|mechanical ventilation|icu ventilation)\b/i,
  },
  {
    category: "RESPIRATORY",
    pattern:
      /\b(?:hfnc|high[ -]flow nasal|high[ -]flow therapy|heated humidifier|ventilator circuits?|flow sensor|expiratory valve|hmef|niv mask|nasal cannula|oxygen concentrator\w*|respiratory circuit\w*|breathing circuit\w*|nebulizer\w*|nebuliser\w*|cpap|bipap|humidifier for (?:ventilator|respiratory))\b/i,
  },
  {
    category: "ANAESTHESIA",
    pattern: /\b(?:anaesthe\w*|anesthe\w*|vapou?ri[sz]er for anaesthesia)\b/i,
  },
  {
    category: "INFUSION",
    pattern:
      /\b(?:infusion pump\w*|syringe pump\w*|volumetric pump\w*|tci pump\w*|enteral feeding pump\w*|feeding pump\w*|infusion workstation\w*|infusion system\w*)\b/i,
  },
  {
    category: "ENDOSCOPY",
    pattern:
      /\b(?:endoscop\w*|chola\w*scop\w*|spy[ -]?glass|insufflator\w*|suction irrigation|endoscopy camera\w*|endoscopy stack|exoscop\w*|or integration|integrated operating room|video gastroscop\w*|colonoscope\w*|gastroscope\w*)\b/i,
  },
  { category: "LAPAROSCOPY", pattern: /\b(?:laparoscop\w*|laparocator\w*)\b/i },
  { category: "ARTHROSCOPY", pattern: /\barthroscop\w*\b/i },
  { category: "BRONCHOSCOPY", pattern: /\bbronchoscop\w*\b/i },
  {
    category: "UROLOGY_ENDOSCOPY",
    pattern:
      /\b(?:cystoscop\w*|ureteroscop\w*|resectoscop\w*|hysteroscop\w*)\b/i,
  },
  {
    category: "ENT_AIRWAY",
    pattern:
      /\b(?:laryngoscop\w*|video laryngoscop\w*|airway management|ent instrument\w*|intubation kit\w*)\b/i,
  },
  {
    category: "SURGICAL_INSTRUMENTS",
    pattern:
      /\b(?:surgical instrument\w*|surgical forceps|surgical scissors|surgical retractor\w*|surgical trocar\w*|laparoscopic instrument\w*|orthopaedic instrument\w*|orthopedic instrument\w*|orthop(?:a)?edic surgical equipment)\b/i,
  },
  {
    category: "ELECTROSURGERY",
    pattern: /\b(?:electrosurg\w*|diathermy|cautery|vessel seal\w*)\b/i,
  },
  {
    category: "HOSPITAL_BEDS",
    pattern:
      /\b(?:hospital bed\w*|icu bed\w*|clinical bed\w*|patient bed\w*|critical[ -]care bed\w*|med[ -]surg bed\w*|pa?ediatric bed\w*|bariatric bed\w*|birthing bed\w*|obstetric bed\w*|smart bed\w*|electric (?:icu |hospital )?bed\w*|motoris?zed hospital bed\w*|electric medical bed\w*)\b/i,
  },
  {
    category: "STRETCHERS",
    pattern:
      /\b(?:stretcher\w*|patient transport trolley\w*|patient(?:s)? (?:transport |shifting )?troll(?:ey|ie)s?)\b/i,
  },
  {
    category: "PRESSURE_CARE",
    pattern:
      /\b(?:pressure care|anti[ -]decubitus|anti[ -]bedsore|pressure relieving mattress\w*|pressure relief mattress\w*|alternating pressure mattress\w*|hospital mattress\w*|air mattress for patients)\b/i,
  },
  {
    category: "CARDIOLOGY_DIAGNOSTICS",
    pattern:
      /\b(?:cardiac stress test|treadmill test system|echocardiograph\w*)\b/i,
  },
  { category: "ECG", pattern: /\b(?:ecg|ekg|electrocardiograph\w*)\b/i },
  { category: "HOLTER", pattern: /\bholter\b/i },
  { category: "ABPM", pattern: /\b(?:abpm|ambulatory blood pressure)\b/i },
  {
    category: "DEFIBRILLATION",
    pattern: /\b(?:defibrillator\w*|automated external defibrillation|aed)\b/i,
  },
  {
    category: "LAB_IVD",
    pattern:
      /\b(?:ivd|in[ -]vitro diagnostic\w*|biochemistry analy[sz]er\w*|hematology analy[sz]er\w*|haematology analy[sz]er\w*|laboratory centrifuge\w*|microscope\w*|elisa|pcr machine\w*|blood gas analy[sz]er\w*)\b/i,
  },
  {
    category: "COAGULATION",
    pattern:
      /\b(?:coagulation analy[sz]er\w*|thromboelastograph\w*|teg system|teg analy[sz]er\w*)\b/i,
  },
  {
    category: "MEDICAL_FURNITURE",
    pattern:
      /\b(?:examination (?:couch|table|chair)|patient chair\w*|clinical chair\w*|dialysis chair\w*|blood donor chair\w*|hospital trolley\w*|patient(?:s)? (?:shifting |transport )?troll(?:ey|ie)s?|bedside cabinet\w*|medical trolley\w*|instrument trolley\w*|operating table\w*|ot table\w*)\b/i,
  },
  {
    category: "CONSUMABLES",
    pattern:
      /\b(?:catheter\w*|suture\w*|surgical glove\w*|medical syringe\w*|iv cannula\w*|infusion set\w*|dialysis consumable\w*|endotracheal tube\w*)\b/i,
  },
  {
    category: "ACCESSORIES",
    pattern:
      /\b(?:ventilator accessor\w*|endoscopy accessor\w*|patient monitor accessor\w*|ecg electrode\w*|ultrasound probe\w*)\b/i,
  },
  {
    category: "MEDICAL_IT",
    pattern:
      /\b(?:pacs|radiology information system|hospital information system|dicom workstation\w*)\b/i,
  },
  {
    category: "OTHER_MEDICAL_EQUIPMENT",
    pattern:
      /\b(?:pacemaker\w*|brachytherapy|radiotherapy equipment|medical equipments?|biopacemaker\w*|brachytherapy|radiotherapy equipment|medical equipments?|radiant warmer|\bcrrt\b|nephelometer|spectrofluorometer|uv[ -]?(?:vis|visible).*spectro|medical oxygen regulator|dialysis machine\w*|haemodialysis|hemodialysis|breast ?board\w*|picc training|(?:training|medical) manne?quin\w*|prosthetic\w*|colposcop\w*|suction (?:apparatus|machine|unit)|dvt pump|vte pump|spirometer|autoclave\w*|sterilizer\w*|steriliser\w*|incubator for neonat\w*)\b/i,
  },
];
export const NONMEDICAL_PATTERNS =
  /\b(?:electrical points|electrical works|electrical cabling|electrification|rewiring|engineering works|building construction|road construction|renovation|air condition(?:er|ing)|transformer|fire doors?|hostel furniture|office tables?|computer monitors?|desktop monitors?|cctv monitors?|traffic monitoring|water pumps?|submersible pumps?|centrifugal pumps?|sewage|sewerage|water treatment|water supply|office chairs?|office furniture|lcd (?:display|panel|monitor)|road (?:works|construction)|civil works?|dg set|diesel generator|stretcher elevators?|passenger elevators?|stretcher lifts?|passenger lifts?|elevators?|lift maintenance|elevator maintenance)\b/i;
