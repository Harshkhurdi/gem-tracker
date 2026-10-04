import type { RawTender } from "../../types/tender";
import { NONMEDICAL_PATTERNS } from "./medical-taxonomy";

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const PHSC_NAME = /^Punjab Health Systems? Corporation$/i;
const EXCLUDED_SCOPE = /\b(?:consumables?|drugs?|medicines?|pharmaceuticals?|reagents?|vaccines?|implants?|syringes?|manpower|staffing|recruitment|outsourcing|empanelment|civil|construction|engineering|buildings?|plumbing|hvac)\b/i;

/** The exact public PHSC Medical Wing chain, never an acronym or title claim. */
export function isPhscBuyer(raw: RawTender): boolean {
  if (raw.sourceId !== "punjab-phsc" || raw.region !== "Punjab") return false;
  const chains = [raw.organisation || "", ...(raw.organisationChain || [])]
    .flatMap((value) => value.split("||"))
    .map(normalize)
    .filter(Boolean);
  return chains.some((value) => PHSC_NAME.test(value)) &&
    chains.some((value) => /^Medical Wing$/i.test(value)) &&
    !chains.some((value) => /\b(?:private|trust|engineering wing)\b/i.test(value));
}

/** Scope-only inspection scheduling. Callers apply deadline and status checks.
 * This predicate supplies no purchased-product evidence or priority category.
 */
export function phscOpaqueCandidate(raw: RawTender): boolean {
  if (!isPhscBuyer(raw)) return false;
  const title = normalize(raw.title);
  const scope = [title, raw.description, raw.productCategory, raw.workCategory]
    .filter(Boolean).join("\n");
  if (EXCLUDED_SCOPE.test(scope) || NONMEDICAL_PATTERNS.test(scope)) return false;
  const referenceOnly = /^(?:e[ -]?tender[\s/: -]*)?PHSC\s*\/[\w\s./()&+-]+$/i.test(title);
  const genericItems = /^(?:(?:supply|procurement|purchase)(?:\s+(?:and|&)\s+installation)?\s+of\s+)?(?:various\s+(?:items?|equipment|equipments|instruments)|(?:medical\s+)?(?:equipment|equipments|instruments)(?:\s*[,/&]\s*(?:equipment|equipments|instruments))?(?:\s+for\s+(?:BLS|ALS)\s+ambulances?)?)(?:\s*\([^)]*\))?$/i.test(title);
  const maintenancePackage = /^(?:CMC|AMC|CAMC)(?:\s+(?:of|for)\s+(?:medical\s+)?(?:equipment|equipments|instruments))?(?:\s*\([^)]*\))?$/i.test(title);
  return referenceOnly || genericItems || maintenancePackage;
}
