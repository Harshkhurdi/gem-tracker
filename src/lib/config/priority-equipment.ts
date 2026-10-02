import type { MedicalCategory, RawTender } from "../../types/tender";
import type { PriorityEquipment } from "../../types/specification";
import { classifyMedical } from "../tender/classifier";
import { closingDeadlineTimestamp } from "../tender/dates";
import { productEvidence } from "../tender/product-evidence";
import { resolveStatus } from "../tender/status";
import { NONMEDICAL_PATTERNS } from "./medical-taxonomy";
export const PRIORITY_EQUIPMENT: {
  id: PriorityEquipment;
  label: string;
  categories: MedicalCategory[];
  aliases: RegExp;
}[] = [
  {
    id: "VENTILATORS",
    label: "Ventilators",
    categories: ["VENTILATION"],
    aliases:
      /\b(?:ventilator\w*|mechanical ventilation(?: system)?|(?:non[ -]?invasive|icu) ventilation|(?:icu|critical care|respiratory) respiratory equipment|respiratory support equipment|hfnc|high[ -]flow nasal cannula|high flow oxygen therapy)\b/i,
  },
  {
    id: "ULTRASOUND",
    label: "Ultrasound",
    categories: ["ULTRASOUND"],
    aliases:
      /\b(?:ultra\s?sound|ultrasonograph\w*|usg|(?:(?:colou?r|vascular|portable|handheld) )?doppler|echocardiograph\w*|echo machines?|pocus)\b/i,
  },
  {
    id: "DEFIBRILLATORS",
    label: "Defibrillators",
    categories: ["DEFIBRILLATION"],
    aliases:
      /\b(?:defibrillator\w*|automated external defibrillator|aed|cardiac resuscitation equipment)\b/i,
  },
  {
    id: "HOSPITAL_BEDS",
    label: "Hospital beds",
    categories: ["HOSPITAL_BEDS", "STRETCHERS", "PRESSURE_CARE"],
    aliases:
      /\b(?:(?:icu|critical[ -]care|hospital|patient|medical|ward|med[ -]surg|bariatric|pa?ediatric|birthing|obstetric|motorized|motorised|five[ -]function|three[ -]function) (?:beds?|cots?)|stretcher\w*|(?:patient|emergency) troll(?:ey|ie)s?|anti[ -]decubitus mattress|pressure relief mattress|alternating pressure mattress)\b/i,
  },
  {
    id: "ENDOSCOPY",
    label: "Endoscopy",
    categories: [
      "ENDOSCOPY",
      "LAPAROSCOPY",
      "ARTHROSCOPY",
      "BRONCHOSCOPY",
      "UROLOGY_ENDOSCOPY",
    ],
    aliases:
      /\b(?:endoscop\w*|gastroscop\w*|colonoscop\w*|duodenoscop\w*|ercp scope|bronchoscop\w*|laparoscop\w*|laparocator\w*|arthroscop\w*|hysteroscop\w*|cystoscop\w*|ureteroscop\w*|u(?:retero|eretero)[ -]?renoscop\w*|video[ -]?laryngoscop\w*|c[ -]mac|(?:co2 )?insufflator\w*|automated endoscope reprocessor|icg imaging|nir imaging)\b/i,
  },
  {
    id: "MAMMOGRAPHY",
    label: "Mammography",
    categories: ["DIAGNOSTIC_IMAGING"],
    aliases: /\b(?:mammograph\w*|digital mamography|breast tomosynthesis)\b/i,
  },
  {
    id: "DIGITAL_RADIOGRAPHY",
    label: "Digital radiography / Mobile DR",
    categories: ["XRAY_DR"],
    aliases: /\b(?:digital radiograph\w*|digital x[ -]?ray\w*|(?:mobile|portable) dr(?: systems?| units?)?|dr systems?|computed radiography|flat[ -]panel detectors?|GM85(?: Fit)?|GC85|GF85)\b/i,
  },
  {
    id: "C_ARM",
    label: "C-arm",
    categories: ["C_ARM"],
    aliases: /\bc[ -]?arms?\b/i,
  },
  {
    id: "INFUSION_PUMPS",
    label: "Syringe / Infusion pumps",
    categories: ["INFUSION"],
    aliases: /\b(?:Flo[ -]?Skan|(?:syringe(?: infusion)?|infusion|volumetric|tci) pumps?|infusion workstations?)\b/i,
  },
  {
    id: "PATIENT_MONITORS",
    label: "Patient monitors",
    categories: ["PATIENT_MONITORING"],
    aliases: /\b(?:(?:patient|icu|bedside|multiparameter|multi[ -]?parameters?) monitors?|central (?:monitoring|nursing) stations?)\b/i,
  },
  {
    id: "PATIENT_WARMING",
    label: "Patient / Fluid warmers",
    categories: ["PATIENT_WARMING"],
    aliases: /\b(?:patient warming (?:systems?|devices?|units?)|(?:forced[ -]air|perioperative) (?:patient )?warming (?:systems?|devices?|units?)|(?:blood|infusion|iv|intravenous) (?:and (?:blood|fluid) )?warmers?|(?:blood (?:and|&) )?fluid warmers?)\b/i,
  },
  {
    id: "OT_LIGHTS",
    label: "OT lights",
    categories: ["OT_LIGHTS"],
    aliases: /\b(?:ot lights?|(?:operation|operating|surgical) (?:theatre |theater |room )?(?:lights?|lamps?)|shadowless (?:surgical )?(?:lights?|lamps?))\b/i,
  },
  {
    id: "ANAESTHESIA",
    label: "Anaesthesia machines",
    categories: ["ANAESTHESIA"],
    aliases: /\b(?:anaesthe\w*|anesthe\w*) (?:workstations?|machines?|systems?|equipment|apparatus)\b/i,
  },
];
// Broad titles enter inspection only; they are not accepted as product evidence.
export const GENERIC_PRIORITY_SCOPE =
  /\b(?:(?:icu|critical[ -]care|life support|medical|respiratory|radiology|diagnostic imaging|imaging|ot|surgical|gastroenterology|urology|ent|emergency|resuscitation|crash cart|minimally invasive surgery) (?:equipment|equipments|package|systems?)|(?:hospital|critical care|medical) furniture)\b/i;
export function genericPriorityCandidate(raw: RawTender): boolean {
  return (
    GENERIC_PRIORITY_SCOPE.test(raw.title) &&
    !NONMEDICAL_PATTERNS.test(raw.title) &&
    !/\b(?:civil|construction|building|plumbing|hvac)\b/i.test(
      [raw.productCategory, raw.workCategory].filter(Boolean).join(" "),
    )
  );
}
export function priorityCategories(
  raw: Pick<
    RawTender,
    | "title"
    | "description"
    | "tenderCategory"
    | "productCategory"
    | "procurementCategory"
    | "workCategory"
  > & { categories?: MedicalCategory[]; documentProductScope?: string },
): PriorityEquipment[] {
  // Descriptions can mention buyer inventory or portal suggestions. Only the
  // declared title or reviewed document product scope may promote a priority.
  const scope = productEvidence(raw.documentProductScope || raw.title);
  const medical = classifyMedical(scope, scope, raw);
  // Compatibility and place-of-use requirements describe the purchased item's
  // surroundings, not additional imaging devices in the procurement.
  const imagingScope = scope
    // Remove the modality used as a compatibility adjective (C-arm compatible
    // table), while retaining actual devices with unrelated DICOM compatibility.
    .replace(/\b(?:c[ -]?arms?|(?:digital )?x[ -]?rays?|(?:mobile|portable) dr|digital radiograph\w*|flat[ -]panel detectors?|(?:digital )?mammograph\w*|ultrasound|colou?r doppler)(?:\s+(?:systems?|machines?|units?|devices?))?\s+compatib(?:le|ility)\b(?!\s+with\b)/gi, " ")
    .replace(/\b(?:compatible with|for use with|usable with|suitable for use with)\b[^\n.;]*/gi, " ")
    .replace(/\b(?:provision of )?x[ -]?ray cassette (?:channel|holder)\b/gi, " ");
  const imagingMedical = classifyMedical(imagingScope, imagingScope, raw);
  // Electrocautery specifications describe laparoscopic cases as a use setting.
  // Strip that phrase only; a purchased instrument on the same line survives.
  const withoutLaparoscopicUse = (text: string) => text.replace(
    /\b(?:for\s+)?laparoscop(?:ic|y)\s+(?:cases?|procedures?)\b/gi, " ",
  );
  const explicitLaparoscopyTitle = /\blaparoscopy\b(?!\s+(?:cases?|procedures?)\b)|\blaparoscopic\s+(?:instruments?|equipment|systems?|sets?|towers?|scopes?)\b/i.test(raw.title);
  const endoscopyScope = [withoutLaparoscopicUse(scope),
    explicitLaparoscopyTitle ? withoutLaparoscopicUse(raw.title) : ""].filter(Boolean).join("\n");
  const endoscopyMedical = classifyMedical(endoscopyScope, endoscopyScope, raw);
  if (!medical.isMedical || /\bsimulat(?:or|ion)\b/i.test(scope)) return [];
  return PRIORITY_EQUIPMENT.filter((p) => {
    // A lighting UPS/battery is an accessory purchase, not an OT-light system.
    // Actual lights supplied with battery/UPS backup remain eligible.
    if (p.id === "OT_LIGHTS" &&
      /\bot lights?\s+(?:ups\s+)?batter(?:y|ies)\b|\b(?:ups|batter(?:y|ies)|backup)\b[^\n.;]*\b(?:for|of)\s+(?:the\s+)?ot lights?\b/i.test(raw.title)) return false;
    if (p.id === "ULTRASOUND" &&
      /\b(?:ultrasound gel|ultrasound ups batteries|(?:fetal|foetal) doppler)\b/i.test(scope)) return false;
    const imagingGroup = ["ULTRASOUND", "MAMMOGRAPHY", "DIGITAL_RADIOGRAPHY", "C_ARM"].includes(p.id);
    const productScope = imagingGroup ? imagingScope : p.id === "ENDOSCOPY" ? endoscopyScope : scope;
    const productMedical = imagingGroup ? imagingMedical : p.id === "ENDOSCOPY" ? endoscopyMedical : medical;
    // Shared medical categories must not promote unrelated modalities or devices.
    const requiresAlias = ["MAMMOGRAPHY", "DIGITAL_RADIOGRAPHY", "INFUSION_PUMPS", "PATIENT_MONITORS"].includes(p.id);
    return (productMedical.categories.some((c) => p.categories.includes(c)) &&
      (!requiresAlias || p.aliases.test(productScope))) ||
      (p.id === "VENTILATORS" && medical.categories.includes("RESPIRATORY") && p.aliases.test(scope)) ||
      (p.id === "ENDOSCOPY" && endoscopyMedical.categories.includes("ENT_AIRWAY") && p.aliases.test(endoscopyScope));
  }).map((p) => p.id);
}
export function discoveryCategories(text: string): PriorityEquipment[] {
  // Discovery shares the clinical guardrails; generic scopes use the separate
  // inspection queue and never become product evidence here.
  return priorityCategories({ title: text });
}

export function currentCandidate(raw: RawTender, now = Date.now()): boolean {
  const state = resolveStatus(raw, new Date(now));
  if (state.status === "CANCELLED" || state.status === "WITHDRAWN") return false;
  const close = state.effectiveClosingDate;
  if (close)
    return (
      closingDeadlineTimestamp(
        raw.datePrecision === "day" ? close.slice(0, 10) : close,
      ) >= now
    );
  // A malformed declared deadline is not proof of a recent unknown opportunity.
  if (raw.extendedClosingDate || raw.originalClosingDate) return false;
  const publish = Date.parse(raw.publishDate || "");
  return Number.isFinite(publish) && publish - now <= 86400000 && now - publish <= 180 * 86400000;
}
export function priorityRank(raw: RawTender, now = Date.now()): number {
  if (!currentCandidate(raw, now)) return -1;
  return priorityCategories(raw).length
    ? 3
    : genericPriorityCandidate(raw)
      ? 2
      : 0;
}
