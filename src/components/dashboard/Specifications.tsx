import type { Tender } from "@/types/tender";
import type {
  SpecificationSection,
  SpecificationItem,
} from "@/types/specification";
const labels: [SpecificationSection, string][] = [
  ["quantity", "Quantity / line items"],
  ["technicalRequirements", "Technical specifications"],
  ["accessories", "Accessories"],
  ["consumables", "Consumables"],
  ["warranty", "Warranty"],
  ["cmc", "CMC / AMC"],
  ["serviceRequirements", "Lifecycle support"],
  ["regulatoryRequirements", "Regulatory requirements"],
  ["bidderEligibility", "Bidder eligibility"],
  ["delivery", "Delivery, installation & training"],
  ["commercialTerms", "Commercial terms"],
];
const provenance = (item: SpecificationItem) => (
  <>
    <a href={item.sourceDocument} target="_blank" rel="noreferrer">
      {item.sourceLabel}
    </a>
    {item.sourcePage ? ` · Page ${item.sourcePage}` : ""}
    {item.sourceSheet ? ` · ${item.sourceSheet}, row ${item.sourceRow}` : ""}
  </>
);
export default function Specifications({ tender }: { tender: Tender }) {
  const spec = tender.specification;
  if (!tender.priorityCategories?.length) return null;
  const status = spec?.extractionStatus || "not-processed";
  return (
    <details className="specification-panel">
      <summary>
        Technical specifications · {status.replaceAll("-", " ")}
      </summary>
      <p>
        Source document excerpts. Portfolio relevance does not establish
        technical compliance or bidder eligibility.
      </p>
      {spec?.notes.map((note, i) => (
        <p className="muted" key={i}>
          {note}
        </p>
      ))}
      <div className="specification-grid">
        {labels.map(([key, label]) => (
          <section key={key}>
            <h4>{label}</h4>
            {key === "accessories" && spec?.sections.accessories.length ? (
              <div className="specification-table">
                <table>
                  <thead>
                    <tr>
                      <th>Accessory</th>
                      <th>Specification</th>
                      <th>Quantity</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spec.sections.accessories.map((item, i) => (
                      <tr key={i}>
                        <td>{item.field}</td>
                        <td>{item.value || item.requirement}</td>
                        <td>{item.quantity || "Not identified"}</td>
                        <td>{provenance(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : spec?.sections[key].length ? (
              <ul>
                {spec.sections[key].map((item, i) => (
                  <li key={i}>
                    <strong>{item.field}: </strong>
                    {item.value || item.requirement}
                    {item.quantity && <span> · Quantity {item.quantity}</span>}
                    <small>
                      {item.mandatory === true
                        ? "Explicit mandatory wording"
                        : item.mandatory === false
                          ? "Optional / not required"
                          : "Mandatory status not identified"}{" "}
                      ·{" "}
                      <a
                        href={item.sourceDocument}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.sourceLabel}
                      </a>
                      {item.sourcePage ? ` · Page ${item.sourcePage}` : ""}
                      {item.sourceSheet
                        ? ` · ${item.sourceSheet}, row ${item.sourceRow}`
                        : ""}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Not identified in parsed documents.</p>
            )}
          </section>
        ))}
      </div>
      {!!spec?.supersededRequirements.length && (
        <details>
          <summary>
            Requirements superseded by amendments (
            {spec.supersededRequirements.length})
          </summary>
          <ul>
            {spec.supersededRequirements.map((item, i) => (
              <li key={i}>
                {item.field}: {item.value || item.requirement} ·{" "}
                <a href={item.supersededBy} target="_blank" rel="noreferrer">
                  Changed by corrigendum
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      <h4>Official documents</h4>
      {spec?.documentSources.length ? (
        <ul>
          {spec.documentSources.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.label}
              </a>{" "}
              · {d.type.replaceAll("-", " ")} · {d.status}
              {d.note && <small>{d.note}</small>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          No accessible technical document has been inspected yet. Check the
          official tender page.
        </p>
      )}
    </details>
  );
}
