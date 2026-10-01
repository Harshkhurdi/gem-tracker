# Implementation validation

Validated on **1 October 2026, 3:30 PM IST**, using real official-source snapshots and the built production Next.js application. These observed results are not a completeness guarantee or seeded application data. This report is not used by the runtime.

## Build and automated checks

- npm install: PASS
- npm run lint: PASS
- npm run typecheck: PASS (also checked without a pre-existing `.next` directory)
- npm test: PASS — **179 tests across 10 files**
- npm run build: PASS — Next.js 16.3.8 production build

## Production browser verification

Chromium exercised the actual production server, API and dashboard. Browser tooling was used only for development verification, not as a production scraper or dependency.

- Protected administrator refresh: PASS. POST invalidates source snapshots, then the browser GET fetches new official-source snapshots; subsequent GET retained identical source-attempt timestamps without another upstream fetch.
- Unauthorized and cross-origin refresh requests rejected: PASS.
- All seven brand filters, including selected-brand explicit-only matching, agree with API records: PASS.
- Default priority places matches for the seven portfolios ahead of other medical equipment: PASS.
- All three region filters agree with API records: PASS.
- Public Refresh results button reads cached data: PASS (359 ms in the browser check).
- Cached initial production API read: 494 ms.
- Diagnostics exposes all 23 institutions and all 18 source statuses: PASS.
- Desktop and 390-pixel mobile screenshots inspected; no mobile page overflow or browser runtime errors: PASS.

The administrator-refresh persistence check completed in one run. A later test-harness selector mismatch interrupted its remaining UI checks; correcting that harness selector and rerunning the controls against those same refreshed snapshots passed. The application did not require an additional upstream refresh for that UI rerun.

## Live pipeline results

| Metric | Count |
| --- | ---: |
| Institutions configured | 23 |
| Adapters configured / attempted | 18 |
| SUCCESS | 6 |
| PARTIAL | 8 |
| UNAVAILABLE | 4 |
| Raw records | 3029 |
| Institution-matched records | 748 |
| Medical matches before deduplication | 292 |
| ACTIVE_VERIFIED | 11 |
| ACTIVE_LIKELY | 14 |
| Total active opportunities | 25 |
| DEADLINE_UNKNOWN | 154 |
| Expired, excluded by default | 105 |
| Cancelled / withdrawn | 0 |
| Non-medical records rejected | 2576 |
| Unassigned records rejected | 161 |
| Duplicates removed | 8 |
| Active statewide procurements | 4 |

Active institutional coverage: **10 institutions** — AIIMS Bathinda, AIIMS Bilaspur, PGIMER Chandigarh, GMC Amritsar, GMC Patiala, Pt JLNGMC Chamba, IGMC Shimla, AIMSS Chamiana, Dr RPGMC Tanda and Dr RKGMC Hamirpur. The four statewide opportunities are included in the total of 25, not additional to it.

## Source results

| Adapter | Result | Raw records |
| --- | --- | ---: |
| aiims-bathinda | SUCCESS | 208 |
| aiims-bilaspur-gem | PARTIAL | 133 |
| aiims-bilaspur-cppp | PARTIAL | 14 |
| aiims-bilaspur-niq | PARTIAL | 127 |
| cppp-pgimer | SUCCESS | 21 |
| punjab-dmer | PARTIAL | 9 |
| punjab-phsc | SUCCESS | 24 |
| punjab-pidb | SUCCESS | 1 |
| chandigarh-eproc | SUCCESS | 169 |
| hp-dmer | SUCCESS | 22 |
| hpmscl | PARTIAL | 6 |
| hp-pwd | UNAVAILABLE | 0 |
| bfuhs | PARTIAL | 2192 |
| gmc-patiala | PARTIAL | 93 |
| gmc-amritsar | PARTIAL | 10 |
| slbsgmc | UNAVAILABLE | 0 |
| esic | UNAVAILABLE | 0 |
| gem-direct | UNAVAILABLE | 0 |

The 18 adapters include the explicitly disabled direct-GeM connector; 17 perform official HTTP reads. SUCCESS means that the adapter retrieved its listing successfully, not that every procurement or later amendment is exhaustively covered. PARTIAL includes document-check limits and failed detail/corrigendum checks.

## Active portfolio matches

| Portfolio | Matching active records |
| --- | ---: |
| Samsung Healthcare | 4 |
| Hamilton Medical | 0 |
| KARL STORZ | 7 |
| LINET | 0 |
| Medcaptain | 1 |
| Spacelabs Healthcare | 0 |
| Skanray | 7 |

Counts overlap when a tender matches more than one portfolio. Zero means no active match in this retrieved coverage, not that the portfolio is unsupported. Generic-product and explicit-brand/model tests cover all seven. Product relevance does not establish supplier eligibility.

## Remaining source and deployment limitations

- Direct GeM querying is unavailable. Official AIIMS institutional GeM mirrors are fetched independently and returned records.
- HP PWD and SLBSGMCH timed out in this run. ESIC public listings could not be read. HP PWD had returned records in an earlier run; outages vary over time.
- Punjab DMER had a failed corrigendum check; HPMSCL had two failed detail checks. Those sources are PARTIAL, and incomplete verification does not become ACTIVE_VERIFIED.
- Bilaspur document checks are bounded; unresolved attachments and amendments require official-document review. BFUHS had six inaccessible relevant PDFs, leaving unverified dates unknown.
- Institutional mirrors may omit later amendments. NIC listing/detail checks and pagination are bounded and expose limits. CAPTCHA-gated BOQs remain official links; no CAPTCHA bypass or mandatory OCR is used.
- No live Vercel deployment was performed or verified. The Node production build and cache/browser behavior passed locally. Official-source access from the eventual Vercel region remains a deployment check.
- Cold aggregation can exceed 60 seconds; routes declare maxDuration 300 for Vercel Fluid Compute. No runtime local persistence or daemon is required.
- Without optional Redis, a cold instance with no previous snapshot cannot recover older records after an upstream outage. Warm refresh retains previous records when available and preserves their verification timestamps.
