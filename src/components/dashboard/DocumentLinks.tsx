"use client";
import { regions } from "@/lib/config/regions";
import { useMemo, useState } from "react";
import type { DashboardData, Tender } from "@/types/tender";
import { filterAndSortTenders } from "@/lib/tender/dashboard-filter";
import { displayDeadline } from "@/lib/tender/deadline-display";
import { displaySourceText } from "@/lib/tender/display-text";
import {
  GEM_BID_SEARCH, gemBidNumber, isGemTender, matchesDocumentView,
  needsManualPortal, tenderDocumentLinks, type DocumentView,
} from "@/lib/tender/document-links";

export default function DocumentLinks({ tenders, data, clock }: {
  tenders: Tender[]; data: DashboardData | null; clock: number;
}) {
  const [view, setView] = useState<DocumentView>("all");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [institution, setInstitution] = useState("");
  const [status, setStatus] = useState("active");
  const rows = useMemo(() => filterAndSortTenders(
    tenders.filter((t) => matchesDocumentView(t, view)),
    { query, region, institution, status, scope: "", category: "", brand: "",
      source: "", closing: "", explicit: false, sort: "closing", prioritize: false }, clock,
  ), [tenders, view, query, region, institution, status, clock]);
  function reset() {
    setView("all"); setQuery(""); setRegion(""); setInstitution(""); setStatus("active");
  }
  return <section aria-label="Document links view">
    <div className="filter-panel">
      <div className="filter-heading">
        <h2>Document links</h2>
        <button className="text-button" onClick={reset}>Reset document filters</button>
      </div>
      <p>Open official notices and documents, including tenders requiring manual portal access. PDF retrieval is optional.</p>
      <label className="search-label">
        <span>Search document links</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Equipment, institution or bid number…" />
      </label>
      <div className="filter-grid">
        <label>Document source
          <select value={view} onChange={(e) => setView(e.target.value as DocumentView)}>
            <option value="all">All official links</option>
            <option value="gem">GeM bids</option>
            <option value="manual">Manual portal access</option>
          </select>
        </label>
        <label>Document region
          <select value={region} onChange={(e) => { setRegion(e.target.value); setInstitution(""); }}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label>Document institution
          <select value={institution} onChange={(e) => setInstitution(e.target.value)}>
            <option value="">All institutions</option>
            {data?.institutions.filter((i) => !region || i.region === region).map((i) =>
              <option key={i.id} value={i.id}>{i.shortName} · {i.city}</option>)}
          </select>
        </label>
        <label>Document status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active opportunities</option>
            <option value="all">All statuses</option>
            <option value="DEADLINE_UNKNOWN">Deadline unknown</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </label>
      </div>
      <p className="muted">GeM search opens the official bid listing. Search using the bid number shown below. Confirm current deadlines and amendments on the official portal. Portal documents may require CAPTCHA or sign-in.</p>
    </div>
    <div className="results-panel">
      <div className="section-heading"><div>
        <h2>Tenders & document links <span className="count-pill">{rows.length}</span></h2>
        <p>From the latest tracker results. Missing or unparsed PDFs do not hide a tender.</p>
      </div></div>
      {!rows.length ? <p className="empty-state">No tenders match these document filters.</p> :
        <div className="table-scroll"><table className="tender-table">
          <thead><tr><th>Tender / bid number</th><th>Institution / deadline</th><th>Official links</th></tr></thead>
          <tbody>{rows.map((t) => <tr key={t.id}>
            <td data-label="Tender / bid number">
              <strong className="tender-title">{t.title}</strong>
              <div className="record-meta">{gemBidNumber(t) || t.tenderId || t.referenceNumber || "Reference not provided"}</div>
              <div className="record-meta">{t.status.toLowerCase().replaceAll("_", " ")}</div>
            </td>
            <td data-label="Institution / deadline">
              <strong>{t.institutionName || displaySourceText(t.organisation) || "Statewide / unassigned buyer"}</strong>
              <div className="record-meta">{t.region}</div>
              <div className="record-meta">Tracked deadline: {displayDeadline(t)}</div>
            </td>
            <td data-label="Official links">
              <div className="document-links">
                {tenderDocumentLinks(t).map((link) => <a key={link.url} href={link.url}
                  target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
                {isGemTender(t) && <a href={GEM_BID_SEARCH} target="_blank" rel="noopener noreferrer">Find bid on GeM ↗</a>}
              </div>
              {needsManualPortal(t) && <p className="muted">Open the tender page, then select its documents and complete any CAPTCHA there.</p>}
              {!tenderDocumentLinks(t).length && !isGemTender(t) && <p className="muted">Official link unavailable.</p>}
            </td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  </section>;
}
