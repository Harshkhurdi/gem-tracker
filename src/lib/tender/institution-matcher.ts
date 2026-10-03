import { institutions } from "@/lib/config/institutions";
import type { Institution, RawTender, Region } from "@/types/tender";
export const normalizeAlias = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const aliasIndex = new Map(institutions.map((i) => [i, [i.name, i.shortName, ...i.aliases].map(normalizeAlias)]));
export function matchInstitutions(
  text: string,
  region?: Region,
): Institution[] {
  const value = " " + normalizeAlias(text) + " ";
  return institutions.filter(
    (i) =>
      (!region || i.region === region) &&
      (aliasIndex.get(i) || []).some((a) =>
        value.includes(" " + a + " "),
      ),
  );
}
export function assignInstitutions(raw: RawTender) {
  const explicit = raw.institutionId
    ? institutions.find((i) => i.id === raw.institutionId)
    : undefined;
  const text = [
    raw.title,
    raw.description,
    raw.organisation,
    ...(raw.organisationChain || []),
    raw.department,
    raw.referenceNumber,
    raw.location,
    ...(raw.consignees || []).map((c) => c.name),
  ]
    .filter(Boolean)
    .join(" ");
  let found = explicit
    ? [explicit]
    : matchInstitutions(
        text,
        raw.sourceId === "cppp-pgimer" ? undefined : raw.region,
      );
  if (raw.sourceId === "cppp-pgimer") {
    const destination = [raw.title, raw.description, raw.location].join(" ");
    const satelliteId = /ferozepur|firozpur|ferozpur/i.test(destination) ? "pgi-ferozepur"
      : /\bsangrur\b/i.test(destination) ? "pgi-sangrur"
      : /\buna\b/i.test(destination) ? "pgi-una" : undefined;
    const satellite = institutions.find((i) => i.id === satelliteId);
    if (satellite) found = [satellite];
  }
  if (found.some((i) => ["pgi-ferozepur", "pgi-sangrur", "pgi-una"].includes(i.id)))
    found = found.filter((i) => i.id !== "pgimer");
  return found;
}

/** Compute attribution once per record, rather than once per facility. */
export function groupRawByInstitution(records: RawTender[]): Map<string, RawTender[]> {
  const grouped = new Map<string, RawTender[]>();
  for (const raw of records) for (const institution of assignInstitutions(raw)) {
    const group = grouped.get(institution.id) || [];
    group.push(raw);
    grouped.set(institution.id, group);
  }
  return grouped;
}
