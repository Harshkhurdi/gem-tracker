import type { BrandMatch, MedicalCategory } from "../../types/tender";
import { MEDICAL_RULES, NONMEDICAL_PATTERNS } from "../config/medical-taxonomy";
import { BRAND_PORTFOLIOS } from "../config/brand-portfolios";

const occurrences = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(new RegExp(pattern.source, "gi"))].map((m) => m[0]);
export function classifyMedical(text: string): {
  categories: MedicalCategory[];
  matchedKeywords: string[];
  confidence: number;
  isMedical: boolean;
} {
  const categories: MedicalCategory[] = [],
    keywords: string[] = [];
  for (const rule of MEDICAL_RULES) {
    const matches = occurrences(text, rule.pattern);
    if (matches.length) {
      categories.push(rule.category);
      keywords.push(...matches);
    }
  }
  // A strong nonmedical scope must not become medical through a buyer's name or boilerplate.
  const excluded = NONMEDICAL_PATTERNS.test(text);
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
): BrandMatch[] {
  const matches: BrandMatch[] = [];
  const medical = classifyMedical(text);
  const relevantCategories = categories ?? medical.categories;
  for (const portfolio of BRAND_PORTFOLIOS) {
    const brands = occurrences(text, portfolio.aliases),
      models = occurrences(text, portfolio.models);
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
    if (NONMEDICAL_PATTERNS.test(text)) continue;
    const relevant = relevantCategories.filter((c) =>
      portfolio.categories.includes(c),
    );
    // Respiratory and generic furniture categories alone do not identify a portfolio.
    const terms = portfolio.clinicalTerms
      ? occurrences(text, portfolio.clinicalTerms)
      : [];
    const eligible = relevant.filter(
      (c) =>
        !(
          portfolio.brand === "Hamilton Medical" &&
          c === "RESPIRATORY" &&
          !terms.length
        ),
    );
    if (
      eligible.length ||
      (portfolio.brand === "LINET" && terms.length > 0 && medical.isMedical)
    ) {
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
