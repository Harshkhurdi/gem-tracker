import { dayOnly, parseIndianDate } from "./dates";

export interface SubmissionDeadline {
  date: string;
  datePrecision: "day" | "minute";
  label: string;
}

/** Read explicitly labelled submission deadlines; never infer one from publication age. */
export function extractSubmissionDeadline(
  text: string,
): SubmissionDeadline | undefined {
  const cleaned = text.replace(/\u00a0/g, " ");
  const labels =
    /\b(?:(?:revised|extended|new)\s+)?(?:bid\s+(?:submission\s+)?end\s+date(?:\s*(?:\/|&|and)\s*time)?|(?:bid\s+)?submission\s+(?:end\s+date|deadline)|closing\s+date(?:\s*(?:\/|&|and)\s*time)?|last\s+date(?:\s*(?:\/|&|and)\s*time)?(?:\s+(?:for|of)\s+(?:bid\s+|tender\s+)?submission(?:\s+of\s+(?:bids?|tenders?))?)?|due\s+date|end\s+date)\b/gi;
  const datePattern =
    /^(?:\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?|\d{1,2}[-/. ](?:\d{1,2}|[A-Za-z]{3,9})[-/. ,]+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?)(?!\d)/i;
  const candidates: (SubmissionDeadline & { revised: boolean })[] = [];
  for (const match of cleaned.matchAll(labels)) {
    const index = match.index!;
    const prefix = cleaned.slice(Math.max(0, index - 65), index);
    // "End Date" can refer to document downloads or opening, not submission.
    if (
      /(?:download|document\s+sale|bid\s+opening|opening\s+of\s+bids?)\s*$/i.test(
        prefix,
      )
    )
      continue;
    const after = cleaned.slice(
      index + match[0].length,
      index + match[0].length + 140,
    );
    // GeM bilingual field labels can put Hindi between the English label and date.
    const remainder = after.replace(/^[\s:;=\-–/()\u0900-\u097f]+/, "");
    const rawDate = remainder.match(datePattern)?.[0];
    if (!rawDate) continue;
    const date = parseIndianDate(rawDate, dayOnly(rawDate));
    if (!date) continue;
    candidates.push({
      date,
      datePrecision: dayOnly(rawDate) ? "day" : "minute",
      label: match[0],
      revised: /^(?:revised|extended|new)\b/i.test(match[0]),
    });
  }
  const revised = candidates.filter((c) => c.revised);
  const authoritative = revised.length ? revised : candidates;
  const dates = new Set(authoritative.map((c) => Date.parse(c.date)));
  // Conflicting deadlines need source-specific amendment review, not a guess.
  if (dates.size !== 1) return;
  const candidate = authoritative[0];
  return {
    date: candidate.date,
    datePrecision: candidate.datePrecision,
    label: candidate.label,
  };
}
