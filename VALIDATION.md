# Implementation validation

Validated on **01 Oct 2026, 16:34 IST** using the built production Next.js application and real official sources. Full individual source, institution and active-record evidence is in [AUDIT.md](AUDIT.md). These observations are documentation, not runtime seed data.

## Build and automated checks

Install, lint, typecheck, 279 tests across 15 files and production build: **PASS**.

## Live counts

| Metric | Observed |
| --- | --- |
| Institutions configured | 23 |
| Adapters attempted | 19 |
| SUCCESS | 6 |
| PARTIAL | 9 |
| UNAVAILABLE | 4 |
| Raw source records | 3718 |
| Institution-matched raw records | 774 |
| Medical rows before deduplication | 296 |
| ACTIVE_VERIFIED | 6 |
| ACTIVE_LIKELY | 20 |
| DEADLINE_UNKNOWN | 144 |
| Expired / excluded by default | 118 |
| Cancelled / withdrawn | 0 |
| Nonmedical rejected | 2585 |
| Unassigned rejected | 837 |
| Duplicates removed | 8 |
| Total active | 26 |
| Active matching at least one of seven portfolios | 9 |
| Institutions with active results | 11 |
| Active statewide | 4 |

## Production browser checks

| Check | Result |
| --- | --- |
| Production server starts | PASS |
| Refresh rejects unauthorized and cross-origin requests | PASS |
| All 19 configured source statuses returned | PASS |
| Admin button accepts protected cache invalidation | PASS |
| Admin button fetches new source snapshots and clears token | PASS |
| Subsequent GET preserves refreshed snapshots without new upstream attempts | PASS |
| Disputed Bilaspur deadlines remain unknown and CRRT has no boilerplate portfolio | PASS |
| Default portfolio priority places all seven company portfolios first | PASS |
| Seven brand filters and explicit-only results match the API | PASS |
| Three region filters match the API | PASS |
| Public Refresh results button reads current cache | PASS |
| Mobile layout fits a 390px viewport | PASS |
| BFUHS official document link returns PDF | PASS |
| Diagnostics includes 23 institutions | PASS |
| No browser runtime errors | PASS |

| Request | Milliseconds |
| --- | --- |
| initialReadMs | 155799 |
| forcedRefreshMs | 174704 |
| cachedReadMs | 567 |
| browserCachedRefreshMs | 404 |

## Source statuses

| Adapter | Status | Raw records |
| --- | --- | --- |
| aiims-bathinda | SUCCESS | 208 |
| aiims-bilaspur-gem | PARTIAL | 133 |
| aiims-bilaspur-cppp | PARTIAL | 14 |
| aiims-bilaspur-niq | PARTIAL | 127 |
| cppp-pgimer | PARTIAL | 24 |
| punjab-dmer | PARTIAL | 9 |
| punjab-phsc | SUCCESS | 22 |
| punjab-pidb | SUCCESS | 1 |
| chandigarh-eproc | SUCCESS | 171 |
| hp-dmer | PARTIAL | 22 |
| hpmscl | SUCCESS | 6 |
| hp-pwd | UNAVAILABLE | 627 |
| bfuhs | PARTIAL | 2193 |
| gmc-patiala | PARTIAL | 93 |
| gmc-amritsar | PARTIAL | 10 |
| slbsgmc | UNAVAILABLE | 0 |
| esic | UNAVAILABLE | 0 |
| cppp-esic | SUCCESS | 58 |
| gem-direct | UNAVAILABLE | 0 |

## Limitations

No live Vercel deployment was performed. Direct GeM coverage is unavailable; official institutional mirrors are independent. Failed sources retain compatible previously verified records only when available and never advance verification dates. Details, scans and amendments are bounded; unknown dates stay unknown. Cold aggregation can exceed 60 seconds; API routes declare maxDuration 300. Actual access from the chosen Vercel region still needs deployment verification. See AUDIT.md for every current source limitation.

## PDF deployment trace verification

The final production build includes PDF worker modules and native polyfills in both tender and diagnostics API traces. Parsing a real official breast-board PDF from a separate directory containing only traced dependencies returned the correct GEM/2026/B/8010657 identity and 28,861 text characters. No full repository node_modules fallback was used. `npm run build` now checks these assets automatically. This packaging check ran after the browser refresh and changed no source adapter logic or data.
