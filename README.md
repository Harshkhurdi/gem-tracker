# Government Medical Tender Tracker

One full-stack Next.js App Router / TypeScript application for government medical-equipment procurement in **Chandigarh, Punjab and Himachal Pradesh**. Deploy the repository directly to Vercel. There is no separate backend, database prerequisite, Python service, Chromium, filesystem cache, or sample live tender dataset.

## Install, run and verify

Requires Node 22.13+ (Node 24 recommended) and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. On an empty cache the first data request queries official sources and can take several minutes. Each source has bounded time and size limits; one source failure does not stop the others. Subsequent reads use cached results.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
npm run fetch:live
npm run audit:data -- --output /tmp/tender-audit
```

`fetch:live` runs the real source adapters and prints genuine success/failure and relevance counts. It never populates production with test fixtures. Government source availability changes by network, hour and hosting region. A successful build is not proof every source can be fetched from Vercel.

## Deploy to Vercel

Import `https://github.com/Harshkhurdi/gem-tracker.git`, choose the **Next.js** preset, and use the repository root. Vercel uses `npm install` and `npm run build`. Do not select static export: the source adapters need Node Route Handlers.

The application starts without any environment variables. Node-specific source/PDF libraries stay in server modules; scraper routes explicitly use `runtime = 'nodejs'`. Long aggregation routes declare a 300-second maximum duration, supported with Vercel Fluid Compute. If your project plan or settings impose a shorter duration, increase its function duration or query fewer sources; first cold requests may exceed a 60-second limit. PDF documents are bounded to 8 MB; HTML to 6 MB. No browser runtime or local storage service is required.

The build explicitly traces PDF workers and native polyfills and checks that the API deployment includes them. This avoids a successful local parse depending on files omitted from a Vercel function. The build guard reads generated traces only during compilation; it is not runtime persistence.

### Environment variables

| Variable                   | Required | Purpose                                                                  |
| -------------------------- | -------- | ------------------------------------------------------------------------ |
| `ADMIN_REFRESH_TOKEN`      | No       | Enables authenticated forced upstream refresh. Use a long random secret. |
| `UPSTASH_REDIS_REST_URL`   | No       | Optional durable last-success cache across deployments.                  |
| `UPSTASH_REDIS_REST_TOKEN` | No       | Optional Redis REST credential; configure together with URL.             |

Never use `NEXT_PUBLIC_` for these values. No actual credentials are committed.

## Sources

The registry is data-driven in `src/lib/sources/registry.ts`:

- AIIMS Bathinda official dated GeM bid mirror, with PDF links.
- AIIMS Bilaspur official **GeM**, **CPPP** and **NIQ** tables, independently parsed; ten-page and twelve-record document-check safeguards are reported; observed listings currently fit within those bounds.
- CPPP PGIMER organisation listings.
- CPPP ESIC organisation listings, matched to Ludhiana; independent of the unavailable ESIC office site and GeM-only coverage.
- Punjab eProcurement DMER, Health & Family Welfare / PHSC, Finance / PIDB.
- Chandigarh Administration eProcurement.
- Himachal eProcurement DMER, **HPMSCL**, and PWD.
- BFUHS university notices and ordinary View/PDF resolution.
- GMC Patiala and GMC Amritsar institution tables.
- SLBSGMCH institutional tender page.
- ESIC public office notices, filtered for Ludhiana; bounded page scanning is partial coverage.
- Direct GeM public search covers Punjab, Chandigarh and Himachal Pradesh through the verified `advance-search` form and its public search responses. It traverses reported regional result pages, recovers repeated-page gaps with closing-date groups and supplements state-government buyer searches. Requests share a four-request pool and have strict per-region count/time limits; remaining omissions and inaccessible documents are reported as PARTIAL. Current GeM index deadlines take precedence over original PDFs. No login or CAPTCHA automation is used.

NIC portals are read through ordinary public organisation links with a short-lived cookie jar. Relevant detail and corrigendum checks are bounded; limits and failures are reported as PARTIAL. CAPTCHA-protected downloads link to the official tender page; the application does not bypass CAPTCHA, automate login or invent GeM endpoints.

## Institutions and project status

**Chandigarh:** PGIMER Chandigarh; GMCH Sector 32.

**Punjab:** AIIMS Bathinda; ESIC Ludhiana; PGIMER Satellite Centre Ferozepur; GMC Patiala/Rajindra Hospital; GMC Amritsar/Guru Nanak Dev Hospital; GGSMCH/BFUHS Faridkot; Dr B.R. Ambedkar AIMS Mohali; Shaheed Udham Singh SIMS Hoshiarpur; Sri Guru Nanak Dev Ji SIMS Kapurthala; Sangrur district medical-college PPP project; SBS Nagar/Nawanshahr medical-college PPP project; Malerkotla government medical-college project; Sant Baba Attar Singh medical-institute society/project at Mastuana Sahib.

**Himachal Pradesh:** AIIMS Bilaspur; IGMC Shimla; AIMSS Chamiana; Dr RPGMC Tanda; SLBSGMCH Nerchowk; Dr YSPGMC Nahan; Pt JLNGMC Chamba; Dr RKGMC Hamirpur.

Project-stage entities are labelled explicitly. The Mastuana society and the Sangrur district PPP project are kept separate; district-only procurement does not establish a particular campus. Lehragaga is withheld because authoritative government ownership/procurement status was not established. New project entries do not mean operational hospitals or active equipment tenders exist.

Authority references: [Punjab DMER directory](https://punjab.gov.in/department-of-medical-education-and-research/), [Punjab Governor address on PPP projects](https://cms.neva.gov.in/NeVA/PB/FileStructures/Notices/d439a677-7215-46f4-a19d-5a85d7d1115d.pdf), [government broadcaster on the Malerkotla project](https://newsonair.gov.in/eid-ul-fitr-which-marks-culmination-of-holy-month-of-ramzan-being-celebrated-in-the-country-today/).

## Matching and accuracy

Institution matching uses normalized aliases, organisation chains, title, description, reference and explicitly named locations/consignees. A procurement office in Shimla is not automatically IGMC. HPMSCL equipment with no identified college remains **statewide**; PET/CT explicitly naming Hamirpur and Tanda is **multi-institution**. Parent PGIMER notices are assigned to Ferozepur only with Ferozepur delivery evidence.

Deterministic medical categories and portfolio rules cover **Samsung Healthcare, Hamilton Medical, KARL STORZ, LINET, Medcaptain, Spacelabs Healthcare and Skanray**. Matching generic clinical products does not require a brand name. Labels distinguish `explicit-brand`, `explicit-model` and `portfolio`. A portfolio match indicates product-category relevance, **not supplier eligibility or compliance with the tender specification**.

The dashboard defaults to **Prioritize selected portfolios**: when sorting by closing date, urgent deadlines come first, then priority equipment, verified status, extraction completeness and portfolio relevance break ties. Newest/relevance sorting retains the portfolio preference. The seven companies have equal priority. Turn it off for ordinary sorting across all medical opportunities. Brand selection includes generic portfolio matches; explicit-only selection requires the selected brand or its model to be named. Source filtering includes contributing sources preserved during deduplication.

Strong negative context rejects office/computer monitors and chairs, hostel furniture, water/sewage pumps, road/building works, lifts, DG sets, vehicles and generic electrical work. Normalization and deduplication prefer strong tender/GeM identifiers; references reused in different procurements are not blindly merged. Provenance links are retained.

Active status uses the **effective closing date**, not publication age. There is no 60-day publication restriction. Date-only deadlines use the end of the Indian day and remain likely. Missing or invalid dates stay unknown. Fresh checked official details can be `ACTIVE_VERIFIED`; institution mirrors or incomplete checks remain `ACTIVE_LIKELY`. Corrections/withdrawals/cancellations take precedence where publicly exposed. New deadline fields and true corrigenda are read before historical "before corrigendum" dates. The open dashboard recalculates expired deadlines and downgrades old verification as the IST date changes. Documents, corrigenda and source provenance survive deduplication; older merged amendment evidence does not overwrite the selected record's newer deadline.

Samsung generic CT portfolio matching requires mobile/portable CT evidence; fixed high-slice and PET/CT systems do not automatically qualify. Proprietary SpyGlass devices do not imply a KARL STORZ opportunity. Admission and examination notices are excluded from medical procurement.

GeM PDF classification uses the declared item, technical specifications and the listing title. GeMARPTS search results, notification categories, help/history and administrative clauses cannot create product categories, portfolio matches, explicit brand/model mentions or confidence. Deadline extraction separately retains access to the original document text.

The source detail parser cannot guarantee every cancellation or amendment was mirrored. It reports failed checks and caps. Scanned documents never yield guessed deadlines; there is no mandatory OCR. A small reviewed-document metadata manifest contains fields visually transcribed from official scans during the audit. A field is applied only after fetching that exact official URL and verifying its SHA-256 against the reviewed bytes; changed files revert to ordinary extraction/unknown dates. This does not verify later amendments, and records remain listing-level/likely. BOQ downloads behind portal CAPTCHA are not fetched.

## Cache and refresh

All source snapshots, including unavailable-source results, use Next.js Data Cache (`unstable_cache`) with 15-minute revalidation and stale-while-revalidate. This prevents repeated expensive requests to failing sources on each dashboard read. Effective status is recalculated from the clock whenever results are returned; old closed tenders are excluded by the dashboard's default Active filter, while unknown, expired and cancelled records remain inspectable.

Public browser reloads read cached results. **Refresh results** reads the latest cache. The admin source-refresh action requires `ADMIN_REFRESH_TOKEN`, accepts it in the Authorization header, and does not store it in browser persistence. The authenticated `POST /api/refresh` invalidates source snapshots and returns `202` with `{ "refreshRequested": true }`. After that response completes, the browser requests `GET /api/tenders` to fetch and cache new source results, even when the previous snapshot was only seconds old. Subsequent reads reuse the new snapshot; concurrent in-flight requests are shared. Results, including failures, are written back into Next's cache. Failure retains previously checked records where a prior snapshot is available; source status remains unavailable and verification timestamps are not advanced. Optional Redis preserves these snapshots across deployments/instances. Without Redis, prior records are retained during warm revalidation and forced refresh; a cold instance with no prior snapshot cannot recover earlier records. The application still works and transparently reports source failures.

```sh
curl -X POST https://YOUR-DEPLOYMENT/api/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_REFRESH_TOKEN"
curl https://YOUR-DEPLOYMENT/api/tenders
```

There is no cron requirement and no reminder automation. `GET /api/tenders` exposes normalized data; `GET /api/diagnostics` exposes source and institution counts, not tokens/cookies/headers. Shared source raw totals are clearly distinguished from institution-matched counts.

## Structure

`src/types` defines public contracts; `src/lib/config` holds institutions, taxonomy and portfolios; `src/lib/sources/adapters` holds official source readers; `src/lib/tender` normalizes, matches, resolves dates/status and deduplicates; `src/lib/cache` handles Next/optional Redis caching; `src/app/api` contains Node backend routes; `src/components/dashboard` contains the responsive UI. Test fixtures exist only under `tests`.

## Second production data audit

[AUDIT.md](AUDIT.md) records the individual audit of all 25 baseline active opportunities, final refreshed records, institution coverage, unknown-deadline breakdown and genuine source limitations. These audit observations are documentation, not runtime seed data. `audit:data` optionally exports source snapshots, normalized data and diagnostics to a chosen development directory; the production application never depends on these filesystem exports.


## Priority equipment and specification extraction

The five priority filters appear in both Opportunities (active counts) and Unknown deadlines (unknown counts), with independent selections. They cover ventilators, ultrasound systems, defibrillators, clinical beds/stretchers/pressure care, and endoscopy. Their counts use the status for the selected section and recalculate as time passes. Ultrasound gel, fetal Doppler and teaching simulators remain in the wider medical tracker without inflating primary equipment counts.

Discovery scans expanded aliases across the official registry, including the full Bathinda tender/quotation list, direct CPPP Bathinda and Bilaspur organisation lists, and Himachal Health & Family Welfare procurement. Generic clinical packages enter document inspection without being accepted as specific equipment; declared official BOQ/specification items must establish the product. Existing civil/department exclusions still apply.

Priority processing runs on refresh and is cached with source snapshots. Each source checks up to 16 active or recent unknown candidates, three at a time, with a 55-second document budget, 16-second request timeout and eight linked documents per record. Warm-process refreshes rotate oversized queues; a cold instance restarts the queue. Historic unknown records older than 180 days are retained for inspection but receive no deep processing. PDF text is bounded to 120 pages/8 MB. Official PDF hyperlinks are followed only to supported document targets. XLSX expansion/rows/columns are bounded; formulas, macros and external links are never executed. Legacy binary XLS and CAPTCHA downloads require manual review. No automatic OCR is configured.

The structured sections include technical requirements, accessories/consumables, warranty, CMC/AMC, lifecycle support, regulatory clauses, eligibility, delivery/training, commercial terms and quantities. Every excerpt carries its document and physical PDF page or worksheet/row. No template value is added when a field is missing. Current dated amendments take precedence; originals remain in amendment history. "Complete" describes the inspected linked set, never product compliance or guaranteed exhaustive portal coverage.

`src/lib/specification/reviewed-scans.ts` contains selected excerpts visually checked from two official current scans. These excerpts are reused only after freshly fetching the exact URL and matching SHA-256. They stay **partial**, explicitly marked as reviewed scan excerpts, and changed files fall back to scanned/unavailable. This is manual source review rather than OCR or synthetic production fixtures. Linked but inaccessible technical attachments remain unavailable; the Bilaspur document's unusual Odisha service-centre wording is retained literally for review.

`audit:data` exports real source snapshots for reproducible category audits. Source success describes listing access; technical-document availability and extraction status are separate. Zero active results do not establish that no unmirrored tender exists.

Already downloaded official PDF bytes can be shared with priority extraction for at most 60 seconds in a bounded 32 MB/12-document memory cache. This avoids a second download immediately after normal metadata inspection. Buffers are copied before PDF worker transfer; expired entries require a new official request.

Partial GeM refreshes retain missing previously seen bids for up to 24 hours with their original check times and a stale marker. They are never presented as newly verified. A complete fetch replaces the prior snapshot, and terminal cancellation notices still take precedence. Portal outages, protected documents and inconsistent pagination mean zero-gap coverage cannot be guaranteed.

The Vercel Node backend is configured in Mumbai (`bom1`) through `vercel.json`. Direct GeM requests timed out from the previous US region; public regional searches and documents were successfully checked from Mumbai after deployment.
