import type { BrandMatch, MedicalCategory, ProcurementCategories } from "../../types/tender";
import { MEDICAL_RULES, NONMEDICAL_PATTERNS } from "../config/medical-taxonomy";
import { productEvidence } from "./product-evidence";
import { BRAND_PORTFOLIOS } from "../config/brand-portfolios";

const occurrences = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(new RegExp(pattern.source, "gi"))].map((m) => m[0]);
// Clinical rooms, buyer metadata and department names describe context, not items.
const clinicalArea = String.raw`(?:anaesthe\w*(?: (?:machine|workstation))?|anesthe\w*(?: (?:machine|workstation))?|radiology|radiography|x[ -]?ray(?: machine)?|ultrasound(?: machine)?|mri(?: machine)?|ct(?: scanner)?|endoscop\w*|laparoscop\w*|bronchoscop\w*|icu|critical care|ot|operation theatre|operating theatre|patient monitoring|monitoring|ventilator)`;
function withoutClinicalContext(text: string): string {
  return text
    .replace(/^\s*(?:department|deptt?|location|buyer|organisation(?: chain)?|office name|hospital name)\s*:[^\n]*/gim, "")
    .replace(new RegExp(String.raw`\b(?:department|deptt?\.?)\s+(?:of{1,2}|for)\s+(?:the\s+)?${clinicalArea}\b`, "gi"), " ")
    .replace(new RegExp(String.raw`\b${clinicalArea}\s+(?:department|deptt?\.?|room|ward|block|wing|area|opd)\b`, "gi"), " ");
}
const infrastructureCategory = /\b(?:works?|civil|construction|building|electrical|plumbing|roads?|drainage|painting|renovation|carpentry|hvac|fire safety|fire fighting|lifts?|elevators?|generators?|dg|transformers?|cabling|water supply|sewage|public works)\b/i;
const procurementAction = /\b(?:supply|procurement|purchase|installation|commissioning|repair|servic(?:e|ing)|maintenance|cmc|camc|amc|replacement)\b/i;
function primaryMedicalObject(text: string, requireAction = false): boolean {
  // The object must precede ancillary infrastructure. "Flooring in a ventilator
  // room" cannot override Civil Works, while "ICU ventilators including wiring" can.
  return (requireAction ? text.split(/[\n;.]/) : [text]).some((part) => {
    const medical = MEDICAL_RULES.flatMap((rule) => {
      const match = rule.pattern.exec(part);
      return match ? [match.index] : [];
    });
    if (!medical.length) return false;
    const object = Math.min(...medical);
    const infrastructure = NONMEDICAL_PATTERNS.exec(part)?.index ?? Infinity;
    const action = procurementAction.exec(part)?.index ?? Infinity;
    return object < infrastructure && (!requireAction || action < object);
  });
}
function hasNonmedicalScope(
  text: string,
  scopeText: string,
  official: ProcurementCategories,
): boolean {
  const sourceCategories = [official.tenderCategory, official.productCategory,
    official.procurementCategory, official.workCategory].filter(Boolean).join(" ");
  if (/\b(?:admission (?:notices?|forms?|applications?|results?)|examination results?|course fees)\b/i.test(scopeText)) return true;
  const infrastructure = NONMEDICAL_PATTERNS.test(scopeText);
  if (infrastructureCategory.test(sourceCategories)) {
    // Generic Works, or a wrongly broad portal category, needs explicit item
    // evidence. A department, generic medical boilerplate or a brand is insufficient.
    return !(primaryMedicalObject(scopeText) ||
      (!infrastructure && primaryMedicalObject(text, true)));
  }
  if (infrastructure) return !primaryMedicalObject(scopeText);
  return !MEDICAL_RULES.some((rule) => rule.pattern.test(scopeText)) &&
    NONMEDICAL_PATTERNS.test(text);
}
export function classifyMedical(
  text: string,
  scopeText = text,
  official: ProcurementCategories = {},
): {
  categories: MedicalCategory[];
  matchedKeywords: string[];
  confidence: number;
  isMedical: boolean;
} {
  const distinctScope = scopeText !== text;
  text = withoutClinicalContext(productEvidence(text));
  scopeText = withoutClinicalContext(productEvidence(scopeText));
  if (distinctScope) text = [scopeText, text].filter(Boolean).join("\n");
  const categories: MedicalCategory[] = [],
    keywords: string[] = [];
  for (const rule of MEDICAL_RULES) {
    // PET/CT is a hybrid modality, not evidence of a standalone CT opportunity.
    const clinicalText =
      rule.category === "CT"
        ? text.replace(/\bpet\s*[/-]?\s*ct(?:\s+scanner)?/gi, "")
        : text;
    const matches = occurrences(clinicalText, rule.pattern);
    if (matches.length) {
      categories.push(rule.category);
      keywords.push(...matches);
    }
  }
  // A generic central monitor can be an IT display. Require the official
  // medical product category or explicit patient parameters before attribution.
  if (/\bcentral monitors?\b/i.test(scopeText) &&
    (/^Medical Equipments\/Waste$/i.test(official.productCategory || "") ||
      /\b(?:patient|bedside|icu|ecg|nibp|spo2|vital signs?)\b/i.test(scopeText)) &&
    !/\b(?:computer|network|cctv|security|industrial|water quality)\b/i.test(scopeText)) {
    if (!categories.includes("PATIENT_MONITORING")) categories.push("PATIENT_MONITORING");
    keywords.push("central monitor");
  }
  // A strong nonmedical scope must not become medical through a buyer's name or boilerplate.
  const excluded = hasNonmedicalScope(text, scopeText, official);
  const matchedKeywords = [...new Set(keywords.map((k) => k.toLowerCase()))];
  const isMedical = categories.length > 0 && !excluded;
  return {
    categories: isMedical ? categories : [],
    matchedKeywords: isMedical ? matchedKeywords : [],
    confidence: isMedical ? Math.min(0.98, 0.72 + categories.length * 0.04) : 0,
    isMedical,
  };
}
export function matchBrands(
  text: string,
  categories?: MedicalCategory[],
  scopeText = text,
  official: ProcurementCategories = {},
): BrandMatch[] {
  const distinctScope = scopeText !== text;
  text = withoutClinicalContext(productEvidence(text));
  scopeText = withoutClinicalContext(productEvidence(scopeText));
  if (distinctScope) text = [scopeText, text].filter(Boolean).join("\n");
  const matches: BrandMatch[] = [];
  if (hasNonmedicalScope(text, scopeText, official)) return matches;
  const medical = classifyMedical(text, scopeText, official);
  if (!medical.isMedical) return matches;
  const relevantCategories = categories
    ? medical.categories.filter((c) => categories.includes(c))
    : medical.categories;
  for (const portfolio of BRAND_PORTFOLIOS) {
    const brands = occurrences(text, portfolio.aliases),
      models = occurrences(text, portfolio.models).filter(
        (model) =>
          !portfolio.ambiguousModels?.test(model) ||
          relevantCategories.some((c) => portfolio.categories.includes(c)),
      );
    if (brands.length) {
      matches.push({
        brand: portfolio.brand,
        matchType: "explicit-brand",
        matchedTerms: [...new Set(brands)],
      });
      continue;
    }
    if (models.length) {
      matches.push({
        brand: portfolio.brand,
        matchType: "explicit-model",
        matchedTerms: [...new Set(models)],
      });
      continue;
    }
    const relevant = relevantCategories.filter(
      (c) =>
        portfolio.categories.includes(c) &&
        (!portfolio.categoryEvidence?.[c] ||
          portfolio.categoryEvidence[c]!.test(text)) &&
        !portfolio.categoryExclusions?.[c]?.test(text),
    );
    // Respiratory and generic furniture categories alone do not identify a portfolio.
    const terms = portfolio.clinicalTerms
      ? occurrences(text, portfolio.clinicalTerms)
      : [];
    const eligible = relevant.filter(
      (c) =>
        !(
          (portfolio.brand === "Hamilton Medical" &&
            c === "RESPIRATORY" &&
            !terms.length) ||
          (portfolio.brand === "LINET" &&
            c === "MEDICAL_FURNITURE" &&
            !terms.length)
        ),
    );
    if (eligible.length || (terms.length > 0 && medical.isMedical)) {
      const keywords = MEDICAL_RULES.filter((r) =>
        eligible.includes(r.category),
      ).flatMap((r) => occurrences(text, r.pattern));
      matches.push({
        brand: portfolio.brand,
        matchType: "portfolio",
        matchedTerms: [...new Set([...keywords, ...terms])],
      });
    }
  }
  return matches;
}
