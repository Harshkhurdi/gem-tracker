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
      /\b(?:ultra\s?sound|ultrasonograph\w*|usg|echo machine\w*|echocardiograph\w*|doppler|sonograph\w*)\b/i,
  },
  {
    category: "XRAY_DR",
    pattern:
      /\b(?:GM85(?: Fit)?|GC85|GF85|flat[ -]panel detectors?|x[ -]?rays?|digital radiograph\w*|radiography|radiographic|dr system|computed radiography)\b/i,
  },
  { category: "C_ARM", pattern: /\bc[ -]?arms?\b/i },
  {
    category: "CT",
    pattern:
      /\b(?:BodyTom|OmniTom|(?:mobile|portable) ct|ct scanner|ct scan|computed tomography|computerized tomography|multislice ct|\d+ ?slice ct)\b/i,
  },
  {
    category: "DIAGNOSTIC_IMAGING",
    pattern:
      /\b(?:(?:medical|clinical|digital) fluoroscop\w*|fluoroscopy (?:machine\w*|system\w*|equipment)|mri|magnetic resonance|mammograph\w*|pet\s*[/-]?\s*ct|medical imaging)\b/i,
  },
  {
    category: "PATIENT_MONITORING",
    pattern:
      /\b(?:patient monitor\w*|icu monitor\w*|multiparameter monitor\w*|multi[ -]?parameter(?:s)? monitor\w*|central (?:monitoring|nursing) station|telemetry|bedside monitor\w*|fetal monitor\w*|foetal monitor\w*|pulse oximeter\w*|capnograph\w*)\b/i,
  },
  {
    category: "VENTILATION",
    pattern:
      /\b(?:HAMILTON[ -](?:C6|C3|C1|T1|MR1|EM7)|ventilator\w*|mechanical ventilation|icu ventilation)\b/i,
  },
  {
    category: "RESPIRATORY",
    pattern:
      /\b(?:H900|hfnc|high[ -]flow nasal|high[ -]flow therapy|heated humidifiers?|ventilator circuits?|flow sensors?|expiratory valves?|hmef|niv masks?|nasal cannulas?|oxygen concentrator\w*|respiratory circuit\w*|breathing circuit\w*|nebulizer\w*|nebuliser\w*|cpap|bipap|humidifier for (?:ventilator|respiratory))\b/i,
  },
  {
    category: "ANAESTHESIA",
    pattern: /\b(?:(?:anaesthe\w*|anesthe\w*)\s+(?:(?:and )?euthanasia )?(?:workstations?|machines?|systems?|equipment|apparatus|vapou?ri[sz]ers?)|vapou?ri[sz]er for anaesthesia)\b/i,
  },
  {
    category: "INFUSION",
    pattern:
      /\b(?:Flo[ -]?Skan|infusion pump\w*|syringe pump\w*|volumetric pump\w*|tci pump\w*|enteral feeding pump\w*|feeding pump\w*|infusion workstation\w*|infusion system\w*)\b/i,
  },
  {
    category: "ENDOSCOPY",
    pattern:
      /\b(?:TELE PACK|TELECAM|VITOM|ENDOMAT|endoscop\w*|chola\w*scop\w*|spy[ -]?glass|insufflator\w*|suction irrigation|endoscopy camera\w*|endoscopy stack|exoscop\w*|or integration|integrated operating room|video gastroscop\w*|colonoscope\w*|gastroscope\w*)\b/i,
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
      /\b(?:C[ -]MAC|laryngoscop\w*|video laryngoscop\w*|airway management|ent instrument\w*|intubation kit\w*)\b/i,
  },
  {
    category: "SURGICAL_INSTRUMENTS",
    pattern:
      /\b(?:surgical instrument\w*|surgical forceps|surgical scissors|surgical retractor\w*|surgical trocar\w*|laparoscopic instrument\w*|orthopaedic instrument\w*|orthopedic instrument\w*|orthop(?:a)?edic surgical equipment)\b/i,
  },
  {
    category: "ELECTROSURGERY",
    pattern:
      /\b(?:AUTOCON|electro[ -]?surg\w*|diathermy|(?:electro[ -]?)?cautery|vessel seal\w*)\b/i,
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
    pattern: /\b(?:cardiac stress test|treadmill test system)\b/i,
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
      /\b(?:ammonia kits? and controls[^\n]{0,80}\b(?:department of )?biochemistry|consumables for (?:the )?(?:department|deptt?\.?) of biochemistry|biochemistry reagent kits?|ivd|in[ -]vitro diagnostic\w*|biochemistry analy[sz]er\w*|hematology analy[sz]er\w*|haematology analy[sz]er\w*|laboratory centrifuge\w*|microscope\w*|elisa|pcr machine\w*|blood gas analy[sz]er\w*)\b/i,
  },
  {
    category: "COAGULATION",
    pattern:
      /\b(?:blood[ -]grouping(?: analy[sz]er\w*)?|(?:coagulation|ha?emostasis) (?:analy[sz]er\w*|system\w*)|thromboelastograph\w*|teg system|teg analy[sz]er\w*)\b/i,
  },
  {
    category: "MEDICAL_FURNITURE",
    pattern:
      /\b(?:hospital furniture|treatment chair\w*|examination (?:couch|table|chair)|patient chair\w*|clinical chair\w*|dialysis chair\w*|blood donor chair\w*|hospital trolley\w*|patient(?:s)? (?:shifting |transport )?troll(?:ey|ie)s?|bedside cabinet\w*|medical trolley\w*|instrument trolley\w*|operating table\w*|ot table\w*)\b/i,
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
      /\b(?:equip(?:ment|ement) for (?:the )?(?:department|deptt?\.?) of (?:orthop(?:a)?edic surgery|pathology)|eeg machines?|electroencephalograph\w*|pacemaker\w*|brachytherapy|radiotherapy equipment|medical equipments?|biopacemaker\w*|radiant warmer|\bcrrt\b|nephelometer|spectrofluorometer|uv[ -]?(?:vis|visible).*spectro|medical oxygen regulator|dialysis machine\w*|haemodialysis|hemodialysis|breast ?board\w*|picc training|(?:training|medical) manne?quin\w*|(?:male )?iv arm training arm|arterial arm trainer|heimlich abdominal thrust (?:training )?model|(?:advance )?epidural(?: and lumbar puncture)? (?:training )?model|lumbar puncture (?:training )?model|(?:automatic )?cpr (?:machines?|trainers?|manne?quins?)|prosthetic\w*|colposcop\w*|suction (?:apparatus|machine|unit)|dvt pumps?|vte pumps?|spirometers?|autoclave\w*|sterilizer\w*|steriliser\w*|incubator for neonat\w*)\b/i,
  },
];
export const NONMEDICAL_PATTERNS =
  /\b(?:civil repair|building repair|building maintenance|building work|public works|repair and maintenance of building|whitewash|white washing|painting|plaster|flooring|tiles?|false ceiling|door repair|window repair|roof repair|waterproofing|masonry|carpentry|plumbing|sanitary work|drainage|sewer|electrical wiring|cabling|(?:diesel|power|standby|electrical) generators?|hvac|ac units?|air handling units?|fire fighting|boundary wall|electrical repair|electrical work|electrical points|electrical works|electrical cabling|electrification|rewiring|engineering works|building construction|road construction|renovation|air condition(?:er|ing)|transformer|fire doors?|hostel furniture|office tables?|computer monitors?|desktop monitors?|cctv monitors?|traffic monitoring|water pumps?|submersible pumps?|centrifugal pumps?|sewage|sewerage|water treatment|water supply|office chairs?|office furniture|office work\w*|office supplies|admission (?:notices?|forms?|applications?|results?)|examination results?|course fees|lcd (?:display|panel|monitor)|road (?:works|construction)|civil works?|dg set|diesel generator|stretcher elevators?|passenger elevators?|stretcher lifts?|passenger lifts?|elevators?|lift maintenance|elevator maintenance)\b/i;
