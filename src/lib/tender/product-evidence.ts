/** Product evidence only: portal discovery results and administrative clauses are not bid scope. */
const technicalHeading = /^(?:.*\/\s*)?(?:technical|product|item)\s+specifications?\b/i;
const administrativeHeading = /(?:buyer added bid specific|consignees\/reporting|general terms and conditions|additional terms and conditions)|^\s*(?:\d+[.)]\s*)?(?:generic|help(?: centre| center)?|procurement history|bid history|terms (?:and|&) conditions|eligibility criteria|warranty|disclaimer)\s*:?(?:\s*$)/i;
const discoveryHeading = /GeMARPTS|searched\s+(?:strings|results?)|result generated|categories selected for notification/i;
const itemEnd = /GeMARPTS|searched|categories selected|minimum average|OEM average|years of past|turnover|document required|MSE relaxation|startup relaxation|bid number|bid end date|buyer added|consignees/i;

export function productEvidence(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const isGem = /GeMARPTS|\bBid Details\b[\s\S]*\bItem Category\b|\bItem Category\b[\s\S]*\bBid Number\b/i.test(text);
  if (!isGem) {
    // Plain titles/descriptions retain their scope; explicitly labelled help/history is excluded.
    const kept: string[] = [];
    let administrative = false;
    for (const line of lines) {
      if (administrativeHeading.test(line) || discoveryHeading.test(line)) administrative = true;
      if (technicalHeading.test(line)) administrative = false;
      if (!administrative) kept.push(line);
    }
    return kept.join("\n");
  }

  // Allow only the declared item and actual specification sections of a GeM PDF.
  // An unrecognised/truncated section contributes no inferred product evidence.
  const kept: string[] = [];
  let section: "item" | "technical" | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\bItem Category\b/i.test(line)) {
      section = "item";
      // Column extraction can put the first item value above its bilingual label.
      let prior = i - 1;
      while (prior >= 0 && i - prior <= 4 && !/total quantity|[a-z]/i.test(lines[prior])) prior--;
      if (prior >= 0 && i - prior <= 4 && !/total quantity|bid details|office name|email/i.test(lines[prior])) kept.push(lines[prior]);
      kept.push(line.replace(/^.*?\bItem Category\b/i, ""));
      continue;
    }
    if (technicalHeading.test(line)) {
      section = "technical";
      kept.push(line);
      continue;
    }
    if (administrativeHeading.test(line) || discoveryHeading.test(line) || (section === "item" && itemEnd.test(line))) section = undefined;
    if (section) kept.push(line);
  }
  return kept.join("\n");
}
