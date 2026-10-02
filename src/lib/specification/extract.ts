import type {
  ParsedDocument,
  SpecificationItem,
  SpecificationSection,
  TenderSpecification,
  PriorityEquipment,
} from "../../types/specification";

type Rule = [SpecificationSection, string, RegExp];
const amendmentWording = /read as|replac\w*|amend\w*|revis\w*|instead of|changed to/i;
// Display groups can contain independent clauses; match the explicit subject.
function clauseSubject(text: string): string {
  return text.toLowerCase()
    .split(/\b(?:shall|must|should|amend\w*|revis\w*|replac\w*|read as|instead of|changed to|is|are)\b|[:=]|\d/)[0]
    .replace(/[^a-z]+/g, " ").trim();
}
const rules: Rule[] = [
  [
    "technicalRequirements",
    "Radiography and mammography",
    /\b(?:anode|focal spot|tube current|tube voltage|kvp|mas|automatic exposure control|aec|dose area product|dap|detective quantum efficiency|dqe|pixel pitch|detector size|compression force|breast tomosynthesis|tomosynthesis|anti.scatter grid)\b/i,
  ],
  [
    "technicalRequirements",
    "C-arm and mobile imaging",
    /\b(?:c.arm|orbital rotation|angulation|isocentric|image intensifier|flat.panel detector|pulsed fluoroscopy|mobile dr|portable dr|wireless detector)\b/i,
  ],
  [
    "technicalRequirements",
    "Infusion and syringe delivery",
    /\b(?:infusion rate|flow rate|bolus|occlusion pressure|occlusion alarm|syringe sizes?|syringe compatibility|drug library|dose error reduction|anti.bolus|anti.free.flow|keep vein open|kvo|infusion accuracy)\b/i,
  ],
  [
    "technicalRequirements",
    "Patient and fluid warming",
    /\b(?:patient warming|fluid warmer|blood warmer|forced.air warming|warming blankets?|warming temperature|temperature range|over.temperature|overheating|heating rate)\b/i,
  ],
  [
    "technicalRequirements",
    "Surgical illumination",
    /\b(?:lux|illuminance|illumination intensity|colou?r rendering index|cri|light.field diameter|shadow dilution|shadowless|surgical light|ot light|sterili[sz]able handles?)\b/i,
  ],
  [
    "technicalRequirements",
    "Anaesthesia delivery",
    /\b(?:anaesthesia machine|anesthesia machine|anaesthesia workstation|anesthesia workstation|vapou?ri[sz]er|fresh gas flow|gas mixer|low.flow anaesthesia|low.flow anesthesia|hypoxic guard|breathing system|carbon dioxide absorber|co2 absorber)\b/i,
  ],
  [
    "technicalRequirements",
    "Airway visualization",
    /\b(?:video laryngoscope|intubation bronchoscope|insertion tube|working channel|angulation|field of view|depth of field|laryngoscope blades?)\b/i,
  ],
  [
    "technicalRequirements",
    "Patient population",
    /\b(?:adult|pa?ediatric|neonatal|infant)\b/i,
  ],
  [
    "technicalRequirements",
    "Ventilation modes",
    /\b(?:vcv|pcv|simv|psv|cpap|bipap|prvc|aprv|niv(?:-st)?|hfnc|volume control|pressure control|pressure support|volume support|spontaneous ventilation|adaptive ventilation|closed.loop|apn(?:ea|oea) backup|recruitment man)\b/i,
  ],
  [
    "technicalRequirements",
    "Ventilation parameters",
    /\b(?:tidal volume|respiratory rate|peep|fio2|i:e ratio|inspiratory (?:time|pressure)|trigger sensitivity|minute volume)\b/i,
  ],
  [
    "technicalRequirements",
    "Monitoring",
    /\b(?:etco2|spo2|nibp|ibp|airway pressure|ppeak|pmean|pplat|(?:lung|dynamic|static) compliance|airway resistance|pressure.volume loop|flow.volume loop|trends|temperature monitoring)\b/i,
  ],
  [
    "technicalRequirements",
    "Battery",
    /\b(?:battery|batteries|hot.swappable|shock count|charge time)\b/i,
  ],
  [
    "technicalRequirements",
    "Gas supply",
    /\b(?:oxygen hose|medical air hose|nist|diss|pipeline pressure|compressed.air|turbine|compressor|paramagnetic|galvanic|fuel cell)\b/i,
  ],
  [
    "technicalRequirements",
    "Alarms",
    /\b(?:alarm|disconnection|gas supply failure)\b/i,
  ],
  [
    "technicalRequirements",
    "Ultrasound probes",
    /\b(?:convex|curvilinear|linear probe|phased array|endocavitary|transvaginal|tvs|transrectal|microconvex|matrix probe|volume probe|tee probe|transducer|active ports)\b/i,
  ],
  [
    "technicalRequirements",
    "Ultrasound imaging modes",
    /\b(?:b.mode|m.mode|colou?r doppler|power doppler|pw doppler|cw doppler|tissue doppler|spectral doppler)\b/i,
  ],
  [
    "technicalRequirements",
    "Advanced imaging",
    /\b(?:elastograph\w*|ceus|3d|4d|stic|needle guidance|needle enhancement|fusion imaging|microvascular|auto imt|auto ef|speckle reduction|compound imaging|fluorescence|icg|nir|nbi|chromoendoscopy)\b/i,
  ],
  [
    "technicalRequirements",
    "Display and image technology",
    /\b(?:screen|display|resolution|touchscreen|medical.grade monitor|full hd|4k|cmos|ccd|3.chip|camera head)\b/i,
  ],
  [
    "technicalRequirements",
    "Data and connectivity",
    /\b(?:dicom|pacs|usb|ssd|storage|network|event review|code summary|nurse.call integration|bed monitoring)\b/i,
  ],
  [
    "technicalRequirements",
    "Defibrillation",
    /\b(?:biphasic|monophasic|energy steps|max\w* energy|joules|cardioversion|manual mode|aed mode)\b/i,
  ],
  [
    "technicalRequirements",
    "Pacing",
    /\b(?:pacing|transcutaneous|demand mode|fixed mode)\b/i,
  ],
  ["technicalRequirements", "ECG", /\b(?:3.lead|5.lead|12.lead|ecg|ekg)\b/i],
  [
    "technicalRequirements",
    "Bed platform and functions",
    /\b(?:[345].section|mattress sections?|motorized|motorised|actuator|backrest|knee rest|height adjustment|trendelenburg|chair position|cardiac chair|auto contour|one.touch cpr|manual cpr|electric cpr|side rails?|castors?|central locking|directional lock|safe working load|swl|patient capacity|bed.exit|brake alarm|weighing scale|angle indicators)\b/i,
  ],
  [
    "technicalRequirements",
    "Endoscopy system",
    /\b(?:gastroscope|colonoscope|duodenoscope|bronchoscope|cystoscope|ureteroscope|hysteroscope|arthroscope|laparoscope|flexible scope|rigid scope|image processor|video processor|endoscopy processor|light source|insufflat\w*|irrigation pump|arthroscopy pump|smoke evacuation|hf generator|electrosurgical generator|monopolar|bipolar|vessel sealing)\b/i,
  ],
  [
    "accessories",
    "Accessories and quantities",
    /\b(?:accessor\w*|humidif\w*|flow sensors?|expiratory (?:valve|cassette)|support arm|trolley|mounting bracket|paddles?|multifunction pads?|defibrillation pads?|pacing pads?|cuffs?|printer|ups|isolation transformer|gel warmer|probe holders?|biopsy guide|iv pole|lifting pole|cylinder holder|urine bag holder|drainage holder|monitor shelf|linen shelf|bed extension|bumper|(?:biopsy|alligator|triprong) forceps|path finder|formalin chamber|cleaning adapt(?:er|or)|snares?|injection needles?|graspers?|retrieval baskets?|guidewires?|suction valves?|air.water valves?|biopsy valves?|cleaning adapters?|leak tester|aer|automated endoscope reprocessor|washing unit|drying cabinet|scope (?:storage )?cabinet|cleaning brushes)\b/i,
  ],
  [
    "consumables",
    "Consumables",
    /\b(?:consumable\w*|breathing circuits?|heated wire|disposable chamber|full face mask|oronasal mask|nasal mask|nasal pillows|headgear|bacterial filter|viral filter|hmef?|hepa|inspiratory filter|expiratory filter|printer paper|mattress|air cells|cleaning brush|detergent)\b/i,
  ],
  ["warranty", "Warranty", /\b(?:warranty|guarantee period)\b/i],
  [
    "cmc",
    "CMC / AMC duration and coverage",
    /\b(?:cmc|camc|amc|comprehensive maintenance|annual maintenance|after warranty|spares? included|labou?r included|consumables excluded|accessories excluded)\b/i,
  ],
  [
    "serviceRequirements",
    "Lifecycle support",
    /\b(?:uptime|down.?time|response time|breakdown|preventive maintenance|penalt\w*|standby|software upgrade|firmware upgrade|service (?:engineer|centre|center)|bending rubber|insertion tube|biopsy channel|light guide bundle|control body)\b/i,
  ],
  [
    "regulatoryRequirements",
    "Regulatory requirements",
    /\b(?:cdsco|bis|iso(?: 13485)?|ce certif\w*|ce mark\w*|ce(?=\s+(?:and|or|approved|required|certified))|us ?fda|fda(?: 510)?|iec 60601(?:-2-4)?|nabl|aerb)\b/i,
  ],
  [
    "bidderEligibility",
    "Bidder eligibility",
    /\b(?:turnover|past experience|similar supply|performance certificates?|oem|manufacturer authori[sz]ation|\bmaf\b|installed base|number of installations|years in manufacturing|non.blacklist\w*|gst|pan registration|pan no|msme|mse relaxation|make in india|class.i local supplier|class.ii local supplier|local content)\b/i,
  ],
  [
    "delivery",
    "Delivery, installation and training",
    /\b(?:delivery (?:period|within|schedule|time|days)|installation|commissioning|site readiness|site modification|training|demonstration|sample requirement|proof.of.concept)\b/i,
  ],
  [
    "commercialTerms",
    "Commercial terms",
    /\b(?:emd|bid security|pbg|performance (?:security|guarantee)|bid validity|bid offer validity|payment|retention|delivery location|exemption)\b/i,
  ],
  [
    "quantity",
    "Quantity / line items",
    /\b(?:total quantity|quantity|qty|\d+\s*(?:units?|nos\.?|pieces?|sets?))\b/i,
  ],
];
export const emptySections = (): TenderSpecification["sections"] => ({
  technicalRequirements: [],
  accessories: [],
  consumables: [],
  serviceRequirements: [],
  warranty: [],
  cmc: [],
  regulatoryRequirements: [],
  bidderEligibility: [],
  delivery: [],
  commercialTerms: [],
  quantity: [],
});
function documentLines(text: string): string[] {
  return text.replace(/\r/g, "").split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}
function clauseText(lines: string[], index: number): string {
  const line = lines[index];
  const next = lines[index + 1];
  return line.length < 100 && /[:/]$/.test(line) && next &&
    !rules.some(([, , pattern]) => pattern.test(next)) ? `${line} ${next}` : line;
}
export function extractSpecifications(
  documents: ParsedDocument[],
  equipmentTypes: PriorityEquipment[],
  now = new Date(),
): TenderSpecification {
  const result: TenderSpecification = {
    extractionStatus: "document-unavailable",
    equipmentTypes,
    sections: emptySections(),
    documentSources: documents.map(
      ({ pages: _pages, productText: _text, links: _links, ...d }) => {
        void _pages;
        void _text;
        void _links;
        return d;
      },
    ),
    extractedAt: now.toISOString(),
    notes: [],
    supersededRequirements: [],
  };
  // Processing order is not precedence for same-date or undated amendments.
  const ambiguousAmendments = new Set<string>();
  const amendments = new Map<string, Map<ParsedDocument, { date: number; requirements: Set<string> }>>();
  for (const doc of documents) {
    if (doc.type !== "corrigendum" || doc.status !== "parsed") continue;
    for (const page of doc.pages) {
      const lines = documentLines(page.text);
      for (let index = 0; index < lines.length; index++) {
        const text = clauseText(lines, index);
        if (!amendmentWording.test(text)) continue;
        for (const [section, field, pattern] of rules) {
          if (!pattern.test(text)) continue;
          const resolvedField = section === "accessories" ? pattern.exec(text)?.[0] || field : field;
          const key = `${section}:${resolvedField.toLowerCase()}:${clauseSubject(text)}`;
          const peers = amendments.get(key) || new Map<ParsedDocument, { date: number; requirements: Set<string> }>();
          const peer = peers.get(doc) || { date: Date.parse(doc.publishedDate || ""), requirements: new Set<string>() };
          peer.requirements.add(text);
          peers.set(doc, peer);
          amendments.set(key, peers);
        }
      }
    }
  }
  for (const [key, peers] of amendments) {
    const records = [...peers.values()];
    const dates = records.map((record) => record.date);
    if (records.some((record) => record.requirements.size > 1) ||
      (dates.length > 1 && (dates.some((date) => !Number.isFinite(date)) || new Set(dates).size !== dates.length)))
      ambiguousAmendments.add(key);
  }
  // Date ordering is required before an amendment can override a current value.
  const ordered = [...documents].sort(
    (a, b) =>
      Number(a.type === "corrigendum") - Number(b.type === "corrigendum") ||
      Date.parse(a.publishedDate || "0") - Date.parse(b.publishedDate || "0"),
  );
  for (const doc of ordered) {
    if (doc.status !== "parsed") continue;
    let inDiscovery = false;
    for (const page of doc.pages) {
      const lines = documentLines(page.text);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /searched (?:strings|result)|gemarpts|categories selected for notification/i.test(
            line,
          )
        )
          inDiscovery = true;
        if (
          /minimum average|oem average|technical specifications?|bidder eligibility|additional terms|buyer added/i.test(
            line,
          )
        )
          inDiscovery = false;
        if (
          page.sheet &&
          line
            .split(" | ")
            .every((c) =>
              /^(?:item description|description of item|specification|quantity|qty|unit|consignee)$/i.test(
                c,
              ),
            )
        )
          continue;
        if (
          inDiscovery ||
          /^(?:page \d+|-- \d+ of \d+ --)$/i.test(line) ||
          line.length < 3
        )
          continue;
        // Preserve adjacent wrapped values but never pull an unrelated section heading.
        const text = clauseText(lines, i);
        for (const [section, field, pattern] of rules) {
          if (!pattern.test(text)) continue;
          // Post-warranty maintenance and uptime guarantees are CMC terms,
          // not the equipment warranty. Preserve genuinely mixed clauses.
          if (
            section === "warranty" &&
            !pattern.test(
              text.replace(
                /(?:post[\s-]*warranty|after\s+(?:satisfactory\s+completion\s+of\s+)?warranty|completion\s+of\s+warranty|uptime\s+warranty)/gi,
                "",
              ),
            )
          )
            continue;
          const item: SpecificationItem = {
            field:
              section === "accessories"
                ? pattern.exec(text)?.[0] || field
                : field,
            requirement: text.slice(0, 1600),
            mandatory: /\b(?:optional|not required|not mandatory)\b/i.test(text)
              ? false
              : /\b(?:shall|must|required|mandatory)\b/i.test(text)
                ? true
                : "unknown",
            sourceDocument: doc.url,
            sourceLabel: doc.label,
            sourcePage: page.page,
            sourceSheet: page.sheet,
            sourceRow: page.row,
            confidence: "high",
          };
          if (/\b(?:qty|quantity)\s*[.:=]?\s*\d+/i.test(text))
            item.quantity = text.match(
              /\b(?:qty|quantity)\s*[.:=]?\s*(\d+(?:\.\d+)?)/i,
            )?.[1];
          item.quantity ||= text.match(
            /\b(\d+(?:\.\d+)?)\s*(?:units?|nos?\.?|pieces?|sets?)\b/i,
          )?.[1];
          if (section === "accessories")
            item.quantity ||= text.match(
              /\b(?:pack|package)\s+of\s+(\d+)\b/i,
            )?.[1];
          if (
            doc.type === "corrigendum" &&
            amendmentWording.test(text)
          ) {
            item.value = text.match(
              /(?:read as|changed to|replaced (?:by|with))\s*[:–-]?\s*(.+)$/i,
            )?.[1];
            const subject = clauseSubject(text);
            const sameField = result.sections[section].filter((x) => x.field === item.field);
            const previous = sameField.filter((x) => subject && clauseSubject(x.requirement) === subject);
            const key = `${section}:${item.field.toLowerCase()}:${subject}`;
            if (ambiguousAmendments.has(key) || previous.length > 1 || (sameField.length && !previous.length)) {
              result.notes.push(
                "An amendment has an ambiguous clause target or chronology; precedence requires official review.",
              );
            } else if (previous.length && (
              Number.isFinite(Date.parse(doc.publishedDate || "")) ||
              documents.filter((d) => d.type === "corrigendum").length === 1
            )) {
              result.supersededRequirements.push(
                ...previous.map((x) => ({ ...x, supersededBy: doc.url })),
              );
              result.sections[section] = result.sections[section].filter(
                (x) => !previous.includes(x),
              );
            } else if (previous.length)
              result.notes.push(
                "Undated amendments contain overlapping requirements; precedence requires official review.",
              );
          }
          if (
            !result.sections[section].some(
              (x) =>
                x.field === item.field && x.requirement === item.requirement,
            )
          )
            result.sections[section].push(item);
        }
      }
    }
  }
  const parsed = documents.filter((d) => d.status === "parsed");
  const technical = parsed.some(
    (d) =>
      d.type === "technical-specification" ||
      /^\s*(?:\d+[.)]\s*)?technical specifications?\b/im.test(
        d.pages.map((p) => p.text).join("\n"),
      ),
  );
  result.extractionStatus = parsed.length
    ? documents.every(
        (d) => d.status === "parsed" && d.textMethod !== "reviewed-scan",
      ) &&
      !result.notes.some((n) =>
        /precedence requires official review/i.test(n),
      ) &&
      technical &&
      result.sections.technicalRequirements.length > 0
      ? "complete"
      : "partial"
    : documents.length
      ? "document-unavailable"
      : "not-processed";
  result.notes.push(
    "Requirements are exact document excerpts. Missing fields mean not identified; portfolio relevance does not establish compliance. Complete means all linked documents in this inspection were parsed, not an eligibility assessment.",
  );
  if (documents.some((d) => d.textMethod === "reviewed-scan"))
    result.notes.push(
      "Selected source scan excerpts were visually reviewed and reused only after matching the freshly fetched document hash. Automated extraction is incomplete; additional attachments may be unavailable.",
    );
  if (documents.some((d) => d.status === "scanned"))
    result.notes.push(
      "Specification document appears scanned; automated extraction incomplete.",
    );
  if (documents.some((d) => d.status === "deferred"))
    result.notes.push(
      "Additional linked documents are deferred by the bounded processing budget.",
    );
  return result;
}
