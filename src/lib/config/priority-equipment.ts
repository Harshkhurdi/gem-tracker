import type { MedicalCategory, RawTender } from "../../types/tender";
import type { PriorityEquipment } from "../../types/specification";
import { classifyMedical } from "../tender/classifier";
import { closingDeadlineTimestamp } from "../tender/dates";
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
      /\b(?:ultra\s?sound|ultrasonograph\w*|usg|(?:colou?r|vascular) doppler|echocardiograph\w*|echo machines?|pocus)\b/i,
  },
  {
    id: "DEFIBRILLATORS",
    label: "Defibrillators",
    categories: ["DEFIBRILLATION"],
    aliases:
      /\b(?:defibrillator\w*|automated external defibrillator|aed systems?|cardiac resuscitation equipment)\b/i,
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
      /\b(?:endoscop\w*|gastroscop\w*|colonoscop\w*|duodenoscop\w*|ercp scope|bronchoscop\w*|laparoscop\w*|laparocator\w*|arthroscop\w*|hysteroscop\w*|cystoscop\w*|ureteroscop\w*|u(?:retero|eretero)[ -]?renoscop\w*|video laryngoscop\w*|(?:co2 )?insufflator\w*|automated endoscope reprocessor|icg imaging|nir imaging)\b/i,
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
  const medical = classifyMedical(
    [raw.title, raw.description].filter(Boolean).join("\n"),
    raw.documentProductScope || raw.title,
    raw,
  );
  if (!medical.isMedical || /\bsimulat(?:or|ion)\b/i.test(raw.title)) return [];
  return PRIORITY_EQUIPMENT.filter(
    (p) =>
      !(
        p.id === "ULTRASOUND" &&
        /ultrasound gel|ultrasound ups batteries|fetal doppler/i.test(raw.title)
      ) &&
      (medical.categories.some((c) => p.categories.includes(c)) ||
        (p.id === "VENTILATORS" &&
          medical.categories.includes("RESPIRATORY") &&
          p.aliases.test(raw.title)) ||
        (p.id === "ENDOSCOPY" && /video laryngoscop/i.test(raw.title))),
  ).map((p) => p.id);
}
export function discoveryCategories(text: string): PriorityEquipment[] {
  return PRIORITY_EQUIPMENT.filter((p) => p.aliases.test(text)).map(
    (p) => p.id,
  );
}
export function currentCandidate(raw: RawTender, now = Date.now()): boolean {
  if (raw.cancelled || raw.withdrawn) return false;
  const close = raw.extendedClosingDate || raw.originalClosingDate;
  if (close)
    return (
      closingDeadlineTimestamp(
        raw.datePrecision === "day" ? close.slice(0, 10) : close,
      ) >= now
    );
  const publish = Date.parse(raw.publishDate || "");
  return Number.isFinite(publish) && now - publish <= 180 * 86400000;
}
export function priorityRank(raw: RawTender, now = Date.now()): number {
  if (!currentCandidate(raw, now)) return -1;
  return priorityCategories(raw).length
    ? 3
    : genericPriorityCandidate(raw)
      ? 2
      : 0;
}
