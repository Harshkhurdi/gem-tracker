import { institutions } from "@/lib/config/institutions";
import type { Institution, RawTender, Region } from "@/types/tender";
export const normalizeAlias = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function matchInstitutions(
  text: string,
  region?: Region,
): Institution[] {
  const value = " " + normalizeAlias(text) + " ";
  return institutions.filter(
    (i) =>
      (!region || i.region === region) &&
      [i.name, i.shortName, ...i.aliases].some((a) =>
        value.includes(" " + normalizeAlias(a) + " "),
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
  if (
    raw.sourceId === "cppp-pgimer" &&
    /ferozepur|firozpur|ferozpur/i.test(
      [raw.title, raw.description, raw.location].join(" "),
    )
  ) {
    const centre = institutions.find((i) => i.id === "pgi-ferozepur");
    if (centre) found = [centre];
  }
  // A Ferozepur delivery overrides a general parent-PGIMER buyer alias.
  if (found.some((i) => i.id === "pgi-ferozepur"))
    found = found.filter((i) => i.id !== "pgimer");
  return found;
}
