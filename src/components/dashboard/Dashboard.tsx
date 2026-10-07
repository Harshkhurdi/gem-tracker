"use client";
import { regions } from "@/lib/config/regions";
import SendToMedOps from "../medops/SendToMedOps";
import Specifications from "./Specifications";
import DocumentLinks from "./DocumentLinks";
import { descriptionExcerpt, displaySourceText } from "@/lib/tender/display-text";
import { PRIORITY_EQUIPMENT } from "@/lib/config/priority-equipment";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardData, Tender } from "@/types/tender";

import {
  PRIORITY_BRANDS as brands,
  daysUntilClosing as daysUntil,
  isActive as active,
  filterAndSortTenders,
  refreshElapsedStatuses,
  contributesToSource,
} from "@/lib/tender/dashboard-filter";

const statusNames: Record<string, string> = {
  ACTIVE_VERIFIED: "Active · verified",
  ACTIVE_LIKELY: "Active · likely",
  DEADLINE_UNKNOWN: "Deadline unknown",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  WITHDRAWN: "Withdrawn",
};
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
function date(value?: string | null, time = false) {
  if (!value) return "Not available";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Not available"
    : (time ? timeFormatter : dateFormatter).format(d);
}
function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function safeUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("/api/documents/")) return value;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}
function ExternalLink({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  const url = safeUrl(href);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  ) : (
    <span>{children}</span>
  );
}

function TenderRows({
  rows,
  data,
}: {
  rows: Tender[];
  data: DashboardData | null;
}) {
  return (
    <div className="table-scroll">
      <table className="tender-table">
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Institution / buyer</th>
            <th>Deadline · IST</th>
            <th>Status & source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td data-label="Opportunity">
                <ExternalLink href={t.tenderUrl || t.sourceUrl}>
                  <strong className="tender-title">{t.title}</strong>
                </ExternalLink>
                <div className="record-meta">
                  {t.tenderId || t.referenceNumber || "Reference not provided"}{" "}
                  · {label(t.procurementScope)}
                </div>
                <div className="tag-list">
                  {!!t.priorityCategories?.length && (
                    <span className="priority-equipment-badge">
                      Priority equipment
                    </span>
                  )}
                  {t.categories.map((c) => (
                    <span className="category-tag" key={c}>
                      {label(c)}
                    </span>
                  ))}
                </div>
                {t.brandMatches.length > 0 && (
                  <div className="brand-matches">
                    {t.brandMatches.map((b) => (
                      <span
                        key={`${b.brand}-${b.matchType}`}
                        className={`match-tag ${b.matchType === "portfolio" ? "" : "explicit"}`}
                        title={b.matchedTerms.join(", ")}
                      >
                        {b.brand} ·{" "}
                        {b.matchType === "portfolio"
                          ? "portfolio match"
                          : b.matchType === "explicit-model"
                            ? "model named"
                            : "brand named"}
                      </span>
                    ))}
                  </div>
                )}
                <details className="record-details">
                  <summary>Details & documents</summary>
                  {descriptionExcerpt(t.description) && <p>{descriptionExcerpt(t.description)}</p>}
                  <p>
                    Published: {date(t.publishDate)} · Checked:{" "}
                    {date(t.checkedAt, true)} IST
                  </p>
                  {(t.tenderCategory ||
                    t.productCategory ||
                    t.procurementCategory ||
                    t.workCategory) && (
                    <dl className="official-categories">
                      {[
                        ["Tender category", t.tenderCategory],
                        ["Official product category", t.productCategory],
                        ["Procurement category", t.procurementCategory],
                        ["Work category", t.workCategory],
                      ]
                        .filter(([, value]) => value)
                        .map(([name, value]) => (
                          <div key={name}>
                            <dt>{name}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                  )}
                  <Specifications tender={t} />
                  <SendToMedOps id={t.id} />
                  {t.originalClosingDate && (
                    <p>
                      Original deadline: {date(t.originalClosingDate)}
                      {t.extendedClosingDate
                        ? ` · Extended: ${date(t.extendedClosingDate)}`
                        : ""}
                    </p>
                  )}
                  {t.consignees && t.consignees.length > 0 && (
                    <p>
                      Consignees: {t.consignees.map((c) => c.name).join(", ")}
                    </p>
                  )}
                  <div className="document-links">
                    <ExternalLink href={t.tenderUrl || t.sourceUrl}>
                      Official tender
                    </ExternalLink>
                    {t.documents?.map((d, i) => (
                      <ExternalLink key={i} href={d.url}>
                        {d.label}
                      </ExternalLink>
                    ))}
                    {t.corrigenda?.map((c, i) => (
                      <ExternalLink key={`c-${i}`} href={c.url}>
                        {c.title || c.type || "Corrigendum"}
                        {c.revisedClosingDate
                          ? ` · ${date(c.revisedClosingDate)}`
                          : ""}
                      </ExternalLink>
                    ))}
                    {t.sourceReferences?.map((r, i) => (
                      <ExternalLink key={`r-${i}`} href={r.url}>
                        {r.sourceName}
                      </ExternalLink>
                    ))}
                  </div>
                  {t.notes?.map((n, i) => (
                    <p className="muted" key={i}>
                      {n}
                    </p>
                  ))}
                </details>
              </td>
              <td data-label="Institution / buyer">
                <strong>
                  {t.institutionName ||
                    (t.institutionId
                      ? data?.institutions.find((i) => i.id === t.institutionId)
                          ?.name
                      : null) ||
                    displaySourceText(t.organisation) ||
                    "Statewide / unassigned buyer"}
                </strong>
                <div className="record-meta">
                  {t.region}
                  {displaySourceText(t.location) ? ` · ${displaySourceText(t.location)}` : ""}
                </div>
                {t.buyer && <div className="record-meta">{t.buyer}</div>}
              </td>
              <td data-label="Deadline · IST">
                <strong>
                  {t.effectiveClosingDate
                    ? date(t.effectiveClosingDate)
                    : "Not published"}
                </strong>
                {t.datePrecision === "minute" && t.effectiveClosingDate &&
                  !/^\d{4}-\d{2}-\d{2}$/.test(t.effectiveClosingDate) && (
                  <div className="record-meta">
                    {date(t.effectiveClosingDate, true)} IST
                  </div>
                )}
                {active(t) && daysUntil(t.effectiveClosingDate) !== null && (
                  <div
                    className={`deadline-note ${daysUntil(t.effectiveClosingDate)! <= 3 ? "urgent" : ""}`}
                  >
                    {daysUntil(t.effectiveClosingDate) === 0
                      ? "Closes today"
                      : daysUntil(t.effectiveClosingDate)! < 0
                        ? "Past closing date · verify source"
                        : daysUntil(t.effectiveClosingDate) === 1
                          ? "Closes tomorrow"
                          : `Closing in ${daysUntil(t.effectiveClosingDate)} days`}
                  </div>
                )}
              </td>
              <td data-label="Status & source">
                <span
                  className={`status-badge status-${t.status.toLowerCase()}`}
                >
                  {statusNames[t.status] || "Unknown status"}
                </span>
                <div className="record-meta">
                  <ExternalLink href={t.sourceUrl}>{t.sourceName}</ExternalLink>
                </div>
                {t.stale && (
                  <span className="stale-label">Cached · stale source</span>
                )}
                <div className="record-meta">
                  {t.verification === "detail"
                    ? "Detail checked"
                    : "Listing evidence"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnknownDeadlines({
  tenders,
  data,
  clock,
}: {
  tenders: Tender[];
  data: DashboardData | null;
  clock: number;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [institution, setInstitution] = useState("");
  const [category, setCategory] = useState("");
  const [priorityEquipment, setPriorityEquipment] = useState("");
  const unknown = useMemo(
    () => tenders.filter((t) => t.status === "DEADLINE_UNKNOWN"),
    [tenders],
  );
  const categories = useMemo(
    () => [...new Set(unknown.flatMap((t) => t.categories))].sort(),
    [unknown],
  );
  const rows = useMemo(
    () => filterAndSortTenders(unknown, {
      query, region, institution, category, priorityEquipment,
      status: "DEADLINE_UNKNOWN", scope: "", brand: "", explicit: false,
      source: "", closing: "", sort: "newest", prioritize: false,
    }, clock),
    [unknown, query, region, institution, category, priorityEquipment, clock],
  );
  function reset() {
    setQuery("");
    setRegion("");
    setInstitution("");
    setCategory("");
    setPriorityEquipment("");
  }
  return (
    <section aria-label="Unknown deadline tenders">
      <section
        className="priority-equipment-panel"
        aria-label="Priority equipment with unknown deadlines"
      >
        <div className="filter-heading">
          <h2>Priority equipment</h2>
          <span>Unknown deadlines</span>
        </div>
        <div className="priority-equipment-grid">
          {PRIORITY_EQUIPMENT.map((p) => (
            <button
              key={p.id}
              className={priorityEquipment === p.id ? "selected" : ""}
              aria-pressed={priorityEquipment === p.id}
              onClick={() => {
                reset();
                setPriorityEquipment(p.id);
              }}
            >
              <span>{p.label}</span>
              <strong>
                {unknown.filter((t) => t.priorityCategories?.includes(p.id)).length}
              </strong>
            </button>
          ))}
        </div>
        <p className="muted">
          Counts cover tenders with unknown deadlines across the monitored sources.
        </p>
      </section>
      <div className="filter-panel">
        <div className="filter-heading">
          <h2>Unknown deadlines</h2>
          <button className="text-button" onClick={reset}>Reset unknown-deadline filters</button>
        </div>
        <p>These tenders have no confirmed closing date. Check the official notice and any amendments before treating them as active.</p>
        <label className="search-label">
          <span>Search unknown deadlines</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Equipment, institution, brand or tender reference…" />
        </label>
        {priorityEquipment && (
          <p>
            Priority equipment filter:{" "}
            {PRIORITY_EQUIPMENT.find((p) => p.id === priorityEquipment)?.label}{" "}
            <button
              className="text-button"
              onClick={() => setPriorityEquipment("")}
            >
              Clear priority filter
            </button>
          </p>
        )}
        <div className="filter-grid">
          <label>Unknown-deadline region
            <select value={region} onChange={(e) => { setRegion(e.target.value); setInstitution(""); }}>
              <option value="">All regions</option>
              {regions.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>Unknown-deadline institution
            <select value={institution} onChange={(e) => setInstitution(e.target.value)}>
              <option value="">All institutions</option>
              {data?.institutions.filter((i) => !region || i.region === region).map((i) =>
                <option key={i.id} value={i.id}>{i.shortName} · {i.city}</option>)}
            </select>
          </label>
          <label>Unknown-deadline equipment category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="results-panel">
        <div className="section-heading"><div>
          <h2>Tenders needing deadline verification <span className="count-pill">{rows.length}</span></h2>
          <p>Newest published first. Open Details &amp; documents for the official source links.</p>
        </div></div>
        {rows.length ? <TenderRows rows={rows} data={data} /> : (
          <div className="empty-state">
            <h3>{data ? "No unknown deadlines match these filters" : "No results loaded yet"}</h3>
            <p>{data ? "Try another region, institution or equipment category." : "Tender results are still loading."}</p>
            <button onClick={reset}>Reset unknown-deadline filters</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("opportunities");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [institution, setInstitution] = useState("");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("");
  const [priorityEquipment, setPriorityEquipment] = useState("");
  const [brand, setBrand] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [prioritize, setPrioritize] = useState(true);
  const [source, setSource] = useState("");
  const [closing, setClosing] = useState("");
  const [sort, setSort] = useState("closing");
  const [token, setToken] = useState("");
  async function load(force = false) {
    setBusy(true);
    setError("");
    try {
      if (force) {
        const refresh = await fetch("/api/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const receipt = await refresh.json();
        if (!refresh.ok || !receipt.refreshRequested)
          throw new Error(
            receipt.error || "Source refresh could not be requested.",
          );
        setToken("");
      }
      // The invalidation response must finish before fetching fresh snapshots.
      const response = await fetch("/api/tenders", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || `Request failed (${response.status})`);
      if (
        !Array.isArray(body.tenders) ||
        !Array.isArray(body.sources) ||
        !Array.isArray(body.institutions)
      )
        throw new Error("The server returned an invalid dashboard response.");
      setData(body);
      setClock(Date.now());
      if (force) setToken("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load tender results.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    // Read cached results; expired snapshots revalidate automatically.
    fetch("/api/tenders", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || `Request failed (${response.status})`);
        if (
          !Array.isArray(body.tenders) ||
          !Array.isArray(body.sources) ||
          !Array.isArray(body.institutions)
        )
          throw new Error("The server returned an invalid dashboard response.");
        if (!controller.signal.aborted) {
          setData(body);
          setClock(Date.now());
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to load tender results.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, []);
  const tenders = useMemo(
    () => refreshElapsedStatuses(data?.tenders || [], clock),
    [data, clock],
  );
  const categories = useMemo(
    () => [...new Set(data?.tenders.flatMap((t) => t.categories) ?? [])].sort(),
    [data],
  );
  const filtered = useMemo(
    () =>
      filterAndSortTenders(
        tenders,
        {
          query,
          region,
          institution,
          scope,
          status,
          category,
          priorityEquipment,
          brand,
          explicit,
          source,
          closing,
          sort,
          prioritize,
        },
        clock,
      ),
    [
      tenders,
      query,
      region,
      institution,
      scope,
      status,
      category,
      priorityEquipment,
      brand,
      explicit,
      source,
      closing,
      sort,
      prioritize,
      clock,
    ],
  );
  function reset() {
    setQuery("");
    setRegion("");
    setInstitution("");
    setScope("");
    setStatus("active");
    setCategory("");
    setPriorityEquipment("");
    setBrand("");
    setExplicit(false);
    setPrioritize(true);
    setSource("");
    setClosing("");
    setSort("closing");
  }
  function selectInstitution(id: string) {
    reset();
    setInstitution(id);
    setTab("opportunities");
  }
  const statewide = filtered.filter(
    (t) => t.procurementScope === "statewide" && !t.institutionId,
  );
  const stats = [
    {
      name: "Institutions in directory",
      value: data?.institutions.length ?? "—",
      detail: `${new Set(data?.institutions.map((i) => i.region) ?? []).size} regions covered`,
    },
    {
      name: "Active opportunities",
      value: data ? tenders.filter(active).length : "—",
      detail: `${tenders.filter((t) => t.status === "ACTIVE_VERIFIED").length} verified · ${tenders.filter((t) => t.status === "ACTIVE_LIKELY").length} likely`,
    },
    {
      name: "Closing in 7 days",
      value: data
        ? tenders.filter(
            (t) =>
              active(t) &&
              daysUntil(t.effectiveClosingDate) !== null &&
              daysUntil(t.effectiveClosingDate)! >= 0 &&
              daysUntil(t.effectiveClosingDate)! <= 7,
          ).length
        : "—",
      detail: "Calendar dates in IST",
    },
    {
      name: "Deadline unknown",
      value: data?.summary.deadlineUnknown ?? "—",
      detail: "Requires source verification",
    },
  ];

  return (
    <div className="dashboard">
      <header className="topbar">
        <Link href="/" className="wordmark">
          <span className="logo-mark" aria-hidden="true">
            t
          </span>
          <span>
            tender<span className="wordmark-light">desk</span>
            <small>MEDICAL PROCUREMENT INTELLIGENCE</small>
          </span>
        </Link>
        <div className="topbar-note">
          <span className="live-dot" /> {regions.join(" · ")}
        </div>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow">THE NORTHERN REGION WATCHLIST</div>
            <h1>Opportunity, in focus.</h1>
            <p>
              Government medical equipment tenders across your institution
              network.
            </p>
          </div>
          <div className="refresh-area">
            <button
              className="button-primary"
              onClick={() => void load()}
              disabled={busy}
            >
              {busy ? "Loading…" : "↻ Refresh results"}
            </button>
            <span>
              Cached results · last source refresh{" "}
              {date(data?.lastRefreshed, true)}
              {data?.lastRefreshed ? " IST" : ""}
            </span>
          </div>
        </section>
        {error && (
          <div className="error-banner" role="alert">
            <strong>Results could not be updated.</strong> {error}
            {data && " Previously loaded results remain visible."}
            <button onClick={() => void load()} disabled={busy}>
              Retry
            </button>
          </div>
        )}
        {!data && busy && (
          <div className="loading-banner" role="status">
            Loading cached tender intelligence…
          </div>
        )}
        <section
          className="stat-grid"
          aria-label="Coverage and opportunity summary"
        >
          {stats.map((s) => (
            <div className="stat-card" key={s.name}>
              <span>{s.name}</span>
              <strong>{s.value}</strong>
              <small>{s.detail}</small>
            </div>
          ))}
        </section>
        <div className="coverage-strip">
          <span>
            <span className="live-dot" /> Source coverage
          </span>
          <strong>
            {data?.sources.filter((s) => s.status === "SUCCESS").length ?? "—"}{" "}
            online
          </strong>
          <span>
            {data?.sources.filter((s) => s.status === "PARTIAL").length ?? "—"}{" "}
            partial
          </span>
          <span className="coverage-failed">
            {data?.sources.filter((s) => s.status === "UNAVAILABLE").length ??
              "—"}{" "}
            unavailable
          </span>
          <span className="muted">
            {data?.sources.filter((s) => s.stale).length ?? 0} stale · live
            access varies by portal
          </span>
        </div>
        <nav className="tabs" aria-label="Dashboard views" style={{ overflowX: "auto" }}>
          {[
            ["opportunities", "Opportunities", filtered.length, "shown"],
            ["unknown", "Unknown deadlines", tenders.filter((t) => t.status === "DEADLINE_UNKNOWN").length, "total"],
            ["documents", "Document links", tenders.length, "total"],
            ["institutions", "Institutions", data?.institutions.length ?? 0],
            ["sources", "Sources & diagnostics", data?.sources.length ?? 0],
          ].map(([id, name, count, countScope]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(String(id))}
            >
              {name}
              <span>{count}{countScope ? ` ${countScope}` : ""}</span>
            </button>
          ))}
        </nav>
        {tab === "opportunities" && (
          <>
            <section
              className="priority-equipment-panel"
              aria-label="Priority equipment opportunities"
            >
              <div className="filter-heading">
                <h2>Priority equipment opportunities</h2>
                <span>Active opportunities</span>
              </div>
              <div className="priority-equipment-grid">
                {PRIORITY_EQUIPMENT.map((p) => (
                  <button
                    key={p.id}
                    className={priorityEquipment === p.id ? "selected" : ""}
                    aria-pressed={priorityEquipment === p.id}
                    onClick={() => {
                      reset();
                      setPriorityEquipment(p.id);
                    }}
                  >
                    <span>{p.label}</span>
                    <strong>
                      {
                        tenders.filter(
                          (t) =>
                            active(t) && t.priorityCategories?.includes(p.id),
                        ).length
                      }
                    </strong>
                  </button>
                ))}
              </div>
              <p className="muted">
                Counts cover the monitored sources. Unknown deadlines remain
                available under All statuses or Deadline unknown.
              </p>
            </section>
            <section className="filter-panel" aria-label="Filter opportunities">
              <div className="filter-heading">
                <h2>Find your next opportunity</h2>
                <button className="text-button" onClick={reset}>
                  Reset filters
                </button>
              </div>
              <label className="search-label">
                <span>Search tenders</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search equipment, specs, institution, brand or tender reference…"
                />
              </label>
              {priorityEquipment && (
                <p>
                  Priority equipment filter:{" "}
                  {
                    PRIORITY_EQUIPMENT.find((p) => p.id === priorityEquipment)
                      ?.label
                  }{" "}
                  <button
                    className="text-button"
                    onClick={() => setPriorityEquipment("")}
                  >
                    Clear priority filter
                  </button>
                </p>
              )}
              <div className="filter-grid">
                <label>
                  Region
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setInstitution("");
                    }}
                  >
                    <option value="">All regions</option>
                    {regions.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Institution
                  <select
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  >
                    <option value="">All institutions</option>
                    {data?.institutions
                      .filter((i) => !region || i.region === region)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.shortName} · {i.city}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Procurement scope
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="">All scopes</option>
                    {["institution", "multi-institution", "statewide"].map(
                      (v) => (
                        <option key={v} value={v}>
                          {label(v)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Active opportunities</option>
                    <option value="all">All statuses</option>
                    {Object.entries(statusNames).map(([v, n]) => (
                      <option key={v} value={v}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Equipment category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Brand portfolio
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  >
                    <option value="">All medical equipment</option>
                    {brands.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Source
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="">All sources</option>
                    {data?.sources.map((s) => (
                      <option key={s.sourceId} value={s.sourceId}>
                        {s.sourceName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Closing window
                  <select
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                  >
                    <option value="">Any deadline</option>
                    <option value="0">Closing today</option>
                    {[3, 7, 14, 30].map((v) => (
                      <option key={v} value={v}>
                        Within {v} days
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="filter-foot">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={prioritize}
                    onChange={(e) => setPrioritize(e.target.checked)}
                  />{" "}
                  Prioritize selected portfolios
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={explicit}
                    onChange={(e) => setExplicit(e.target.checked)}
                  />{" "}
                  Explicit brand or model mentions only
                </label>
                <span>
                  Portfolio matches indicate product relevance, not manufacturer
                  eligibility.
                </span>
              </div>
            </section>
            <section className="results-panel">
              <div className="section-heading">
                <div>
                  <h2>
                    Tracked opportunities{" "}
                    <span className="count-pill">{filtered.length}</span>
                  </h2>
                  <p>
                    {status === "active"
                      ? "Verified and likely active records."
                      : "Records matching your filters."}{" "}
                    {prioritize
                      ? "Closing urgency comes first; priority equipment and portfolio relevance break equal-deadline ties. "
                      : "All medical equipment follows the selected sort. "}
                    Dates shown in Indian Standard Time.
                  </p>
                </div>
                <label className="sort-control">
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="closing">Closing soonest</option>
                    <option value="newest">Newest published</option>
                    <option value="relevance">Highest relevance</option>
                  </select>
                </label>
              </div>
              {filtered.length ? (
                <TenderRows rows={filtered} data={data} />
              ) : (
                <div className="empty-state">
                  <span aria-hidden="true">⌕</span>
                  <h3>
                    {data
                      ? "No opportunities match these filters"
                      : "No results loaded yet"}
                  </h3>
                  <p>
                    {data
                      ? "Try another region, include unknown deadlines, or broaden your equipment search. An empty result does not confirm that a source has no tenders."
                      : "Load cached results to see the latest available records."}
                  </p>
                  <button
                    onClick={data ? reset : () => void load()}
                    disabled={busy}
                  >
                    {data ? "Reset filters" : "Load results"}
                  </button>
                </div>
              )}
            </section>
            <details className="statewide-section">
              <summary>
                Statewide procurement · {statewide.length} records without an
                assigned institution
              </summary>
              <p>
                State and central buying bodies may serve multiple institutions.
                These records are kept separate from direct institution
                assignments; named consignees remain visible in the details.
                This section follows the current filters; use the status filter
                to inspect expired or unknown deadlines.
              </p>
              {statewide.length ? (
                <TenderRows rows={statewide} data={data} />
              ) : (
                <p className="muted">
                  No statewide records in the available data.
                </p>
              )}
            </details>
          </>
        )}
        {tab === "unknown" && (
          <UnknownDeadlines tenders={tenders} data={data} clock={clock} />
        )}
        {tab === "documents" && (
          <DocumentLinks tenders={tenders} data={data} clock={clock} />
        )}
        {tab === "institutions" && (
          <section>
            <div className="section-heading">
              <div>
                <h2>The institution network</h2>
                <p>
                  {data?.institutions.length ?? 0} institutions · counts from
                  directly matched notices and named consignees. Statewide purchases are listed separately; zero does not prove that a facility has no tender.
                </p>
              </div>
            </div>
            <div className="institution-grid">
              {data?.institutions.map((i) => {
                const records = tenders.filter(
                  (t) =>
                    t.institutionId === i.id ||
                    t.consignees?.some((c) => c.institutionId === i.id),
                );
                const sources = data.sources.filter((s) =>
                  i.sourceIds.includes(s.sourceId),
                );
                const regionalBuying = tenders.filter((t) => t.procurementScope === "statewide" && !t.institutionId && t.region === i.region && active(t)).length;
                const incomplete = !sources.length || sources.some((s) => s.status !== "SUCCESS" || s.stale);
                return (
                  <article className="institution-card" key={i.id}>
                    <div className="institution-top">
                      <span className="region-tag">{i.region}</span>
                      <span className="muted">
                        {label(i.operationalStatus)}
                      </span>
                    </div>
                    <h3>{i.shortName}</h3>
                    <p className="institution-name">{i.name}</p>
                    <div className="record-meta">
                      {i.city} · {label(i.institutionType)}
                    </div>
                    <div className="institution-counts">
                      <div>
                        <strong>{records.filter(active).length}</strong>
                        <span>Direct active matches</span>
                      </div>
                      <div>
                        <strong>
                          {
                            records.filter(
                              (t) => t.status === "DEADLINE_UNKNOWN",
                            ).length
                          }
                        </strong>
                        <span>Unknown deadline</span>
                      </div>
                      <div>
                        <strong>{records.length}</strong>
                        <span>Total records</span>
                      </div>
                    </div>
                    <div className="institution-health">
                      {sources.length ? (
                        sources.map((s) => (
                          <span
                            key={s.sourceId}
                            title={`${s.sourceName}: ${s.status}${s.stale ? " (stale)" : ""}`}
                            className={`health-chip health-${s.status.toLowerCase()}`}
                          >
                            {s.sourceName} ·{" "}
                            {s.status === "SUCCESS"
                              ? "online"
                              : s.status.toLowerCase()}
                            {s.stale ? " · stale" : ""}
                          </span>
                        ))
                      ) : (
                        <span className="muted">
                          No source result available
                        </span>
                      )}
                    </div>
                    {!records.length && <p className="institution-note">
                      No directly matched notice found.{incomplete ? " Source coverage is incomplete." : " No direct match was found in the sources checked."}
                      {regionalBuying > 0 ? ` ${regionalBuying} active buying-body tenders are listed separately for ${i.region}; their individual delivery facilities may not be published.` : " A facility may procure through a central buying body rather than publish its own notice."}
                    </p>}
                    {i.note && <p className="institution-note">{i.note}</p>}
                    <div className="institution-actions">
                      <button
                        className="text-button"
                        onClick={() => selectInstitution(i.id)}
                      >
                        View opportunities →
                      </button>
                      {regionalBuying > 0 && <button className="text-button" onClick={() => {
                        reset(); setRegion(i.region); setScope("statewide"); setTab("opportunities");
                      }}>Regional buying-body tenders ({regionalBuying}) →</button>}
                      <ExternalLink href={i.officialUrl}>
                        Official site
                      </ExternalLink>
                    </div>
                  </article>
                );
              })}
            </div>
            {!data && <p>No institution data loaded.</p>}
          </section>
        )}
        {tab === "sources" && (
          <section className="sources-panel">
            <div className="section-heading">
              <div>
                <h2>Source health & traceability</h2>
                <p>
                  Successful retrieval does not guarantee complete coverage.
                  Partial, unavailable and stale sources need review.
                </p>
              </div>
              <a
                href="/api/diagnostics"
                target="_blank"
                rel="noopener noreferrer"
                className="outline-link"
              >
                Open diagnostics JSON ↗
              </a>
            </div>
            <div className="source-grid">
              {data?.sources.map((s) => (
                <article key={s.sourceId} className="source-card">
                  <div className="source-card-top">
                    <h3>{s.sourceName}</h3>
                    <span
                      className={`health-chip health-${s.status.toLowerCase()}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="record-meta">
                    Attempted {date(s.attemptedAt, true)} IST ·{" "}
                    {Math.round(s.durationMs / 1000)}s
                  </p>
                  <p>
                    Last successful retrieval:{" "}
                    <strong>
                      {date(s.successfulAt, true)}
                      {s.successfulAt ? " IST" : ""}
                    </strong>
                  </p>
                  {s.stale && (
                    <p className="stale-label">
                      Stale cached records · not freshly verified
                    </p>
                  )}
                  {s.error && <p className="source-error">{s.error}</p>}
                  {s.notes.map((n, j) => (
                    <p className="muted" key={j}>
                      {n}
                    </p>
                  ))}
                  <div className="source-metric-row">
                    <span>
                      <strong>{s.metrics.rawRecords}</strong> retrieved
                    </span>
                    <span>
                      <strong>{s.metrics.medicalMatches}</strong> medical
                      matches
                    </span>
                    <span>
                      <strong>
                        {
                          tenders.filter((t) =>
                            contributesToSource(t, s.sourceId),
                          )
                            .length
                        }
                      </strong>{" "}
                      included
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <details className="diagnostics-details">
              <summary>Record processing diagnostics</summary>
              <div className="table-scroll">
                <table className="diagnostics-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Raw</th>
                      <th>Institution matches</th>
                      <th>Medical matches</th>
                      <th>False positives rejected</th>
                      <th>Unassigned rejected</th>
                      <th>Detail checks</th>
                      <th>Included records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.sources.map((s) => (
                      <tr key={s.sourceId}>
                        <td>{s.sourceName}</td>
                        <td>{s.metrics.rawRecords}</td>
                        <td>{s.metrics.institutionMatches}</td>
                        <td>{s.metrics.medicalMatches}</td>
                        <td>{s.metrics.falsePositivesRejected}</td>
                        <td>{s.metrics.unassignedRejected}</td>
                        <td>{s.metrics.detailChecks}</td>
                        <td>
                          {
                            tenders.filter((t) =>
                              contributesToSource(t, s.sourceId),
                            )
                              .length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Included records are computed from the final dataset after
                normalization and deduplication. Source processing counts may
                overlap. Duplicates removed:{" "}
                {data?.summary.duplicatesRemoved ?? "—"}.
              </p>
            </details>
            <details className="admin-panel">
              <summary>Administrator source refresh</summary>
              <p>
                Refresh results reads the existing cache. This action performs a
                new source retrieval and requires an administrator token.
              </p>
              {data?.refreshEnabled ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void load(true);
                  }}
                >
                  <label>
                    Administrator token
                    <input
                      type="password"
                      autoComplete="off"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter refresh token"
                      required
                    />
                  </label>
                  <button className="button-primary" disabled={busy || !token}>
                    {busy ? "Refreshing sources…" : "Refresh sources"}
                  </button>
                </form>
              ) : (
                <p className="muted">
                  Source refresh is not enabled on this deployment.
                </p>
              )}
            </details>
          </section>
        )}
      </main>
      <footer>
        <span>tenderdesk · Government medical procurement</span>
        <span>
          Always verify deadlines, eligibility and corrigenda on the official
          tender portal.
        </span>
      </footer>
    </div>
  );
}
