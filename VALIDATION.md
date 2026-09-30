# Implementation validation

Validated on 30 September 2026 against real official sources. These are an observed run, not a completeness guarantee or seeded application data. The application always fetches live source snapshots; this report is not used by the runtime.

## Build and automated checks

- npm install: PASS
- npm run lint: PASS
- npm run typecheck: PASS
- npm test: PASS — 77 tests in seven files
- npm run build: PASS — Next.js 16.3.8 production build
- Production HTTP checks: home 200, data 200, diagnostics for all 23 institutions, disabled refresh 503, invalid document ID 400.
- Repeated production cached API read: 0.32 seconds. Source failures were cached too.
- Refresh authorization, cross-origin rejection, forced-cache persistence and failure retention covered by automated tests.

## Final independent live pipeline

| Metric                               | Count |
| ------------------------------------ | ----: |
| Institutions configured              |    23 |
| Adapters attempted                   |    18 |
| SUCCESS                              |     8 |
| PARTIAL                              |     6 |
| UNAVAILABLE                          |     4 |
| Raw records                          |  3516 |
| Institution-matched records          |   665 |
| Medical matches before deduplication |   280 |
| ACTIVE_VERIFIED                      |    13 |
| ACTIVE_LIKELY                        |    10 |
| DEADLINE_UNKNOWN                     |   153 |
| Expired, excluded by default         |    97 |
| Cancelled / withdrawn                |     0 |
| Non-medical records rejected         |  2504 |
| Unassigned records rejected          |   732 |
| Duplicates removed                   |     7 |
| Active statewide procurements        |     4 |

Active institutional coverage: 10 institutions — aiims-bathinda, gmc-amritsar, gmc-patiala, pgimer, aiims-bilaspur, jlngmc-chamba, igmc-shimla, aimss-chamiana, rpgmc-tanda, rkgmc-hamirpur.

## Source results

| Adapter             | Result      | Raw records | Detail checks |
| ------------------- | ----------- | ----------: | ------------: |
| aiims-bathinda      | SUCCESS     |         208 |             0 |
| aiims-bilaspur-cppp | PARTIAL     |          14 |             0 |
| aiims-bilaspur-niq  | PARTIAL     |         127 |             0 |
| punjab-phsc         | SUCCESS     |          25 |             1 |
| punjab-pidb         | SUCCESS     |           1 |             0 |
| punjab-dmer         | SUCCESS     |           9 |             2 |
| cppp-pgimer         | SUCCESS     |          19 |             2 |
| chandigarh-eproc    | SUCCESS     |         187 |             0 |
| aiims-bilaspur-gem  | PARTIAL     |         133 |             3 |
| hp-pwd              | SUCCESS     |         565 |             0 |
| hp-dmer             | SUCCESS     |          22 |             4 |
| gmc-amritsar        | PARTIAL     |          10 |             0 |
| gmc-patiala         | UNAVAILABLE |           0 |             0 |
| gem-direct          | UNAVAILABLE |           0 |             0 |
| hpmscl              | PARTIAL     |           6 |             5 |
| slbsgmc             | UNAVAILABLE |           0 |             0 |
| bfuhs               | PARTIAL     |        2190 |             0 |
| esic                | UNAVAILABLE |           0 |             0 |

18 adapters includes the explicitly disabled direct-GeM connector; 17 perform official HTTP reads. SUCCESS describes a successful adapter retrieval, not guaranteed exhaustive procurement coverage. PARTIAL includes pagination/document-check limits and failed checks.

## Real limitations

- Direct GeM is unavailable; official AIIMS GeM mirrors are independent sources and succeeded in this run.
- ESIC public listing could not be read; SLBSGMCH returned HTTP 502. GMC Patiala timed out in the final run, although its official page succeeded in the production-server run. Patiala procurement was still found through Punjab DMER.
- Public institutional mirrors can omit later amendments. NIC detail/corrigendum checks are bounded and partial where limits are reached.
- BFUHS PDF checks were unavailable in this run; deadlines and unproven consignees remain unknown. Scanned PDFs have no mandatory OCR. CAPTCHA-gated BOQs are linked for manual review, not bypassed.
- A source outage can lower counts between runs. An earlier production-server run returned 15 active records while Bilaspur GeM/NIQ and PGIMER timed out. The final independent run recovered those sources and returned 23.
- No live Vercel deployment was performed. Node route handlers, production build and cache behavior were tested locally; government access from the eventual Vercel region remains a deployment check.
- Cold aggregation can exceed 60 seconds; routes declare maxDuration 300 for Vercel Fluid Compute. No local persistence or daemon is required.
