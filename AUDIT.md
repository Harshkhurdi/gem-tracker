# Production data audit — 1 October 2026

This second pass audits data quality and production behavior without redesigning the tracker. The baseline contains 25 active rows: 11 `ACTIVE_VERIFIED` and 14 `ACTIVE_LIKELY`. The authoritative baseline counters are 3,029 raw records, 292 medical-relevant rows, 154 unknown deadlines and 105 expired rows. Raw source totals and retained normalized totals are different measures.

`VERIFIED`, `UPDATED` and `REMOVED` below are **audit actions**, not application status values. `VERIFIED` means the recorded fields were checked against fresh official evidence at audit time; it does not promote an official GeM mirror to `ACTIVE_VERIFIED`. `REMOVED` means removal from the active result set, not deletion of the record or a finding of cancellation. An unresolved mirror/PDF deadline conflict remains visible as `DEADLINE_UNKNOWN`.

All baseline active records were checked individually. Procurement identity, clinical relevance, institution/scope, dates, observable cancellation/withdrawal and available amendment evidence were reviewed. No tender-specific cancellation or withdrawal was established in these 25 records. CAPTCHA/login controls were not bypassed. The audit is a point-in-time source check, not a guarantee of later portal changes.

## All 25 baseline active records

All times below are Indian Standard Time. NIC evidence links point to the official detail; mirror evidence links point to the underlying official PDF. Same-date precise PDF times replace end-of-day placeholders. Conflicting calendar dates require amendment review rather than selecting the later date.

| # | Tender identity and baseline title | Audit action | Observed fields and correction | Official source |
| --- | --- | --- | --- | --- |
| 1 | GEM/2026/B/7889626<br>Flat Panel C-arm Machine | UPDATED | Labelled bid deadline now 13 Oct 2026 16:00 IST; day → minute precision. Live GeM amendments remain unchecked. | [Official evidence](https://www.aiimsbathinda.edu.in/images/procurements/20260925014316.pdf) |
| 2 | GEM/2026/B/8034327<br>Electrocautery Machine (V2) (Q2) | UPDATED | Labelled bid deadline now 13 Oct 2026 16:00 IST; day → minute precision. Live GeM amendments remain unchecked. | [Official evidence](https://www.aiimsbathinda.edu.in/images/procurements/20260925014718.pdf) |
| 3 | GEM/2026/B/7891714<br>Radiant Warmer | UPDATED | Labelled bid deadline now 16 Oct 2026 12:00 IST; day → minute precision. Live GeM amendments remain unchecked. | [Official evidence](https://www.aiimsbathinda.edu.in/images/procurements/20260923035403.pdf) |
| 4 | GEM/2026/B/8028120<br>CRRT Machine | UPDATED | Labelled bid deadline now 13 Oct 2026 16:00 IST; day → minute precision. Live GeM amendments remain unchecked. | [Official evidence](https://www.aiimsbathinda.edu.in/images/procurements/20260921045328.pdf) |
| 5 | GEM/2026/B/7953878<br>EEG Machine (Q2) | UPDATED | Labelled bid deadline now 08 Oct 2026 17:00 IST; day → minute precision. Live GeM amendments remain unchecked. | [Official evidence](https://www.aiimsbathinda.edu.in/images/procurements/20260917101938.pdf) |
| 6 | GEM/2026/B/8047970<br>Laparocator with camera (GeM Bid No. GEM/2026/B/8047970) | VERIFIED | Fresh listing 08 Oct 2026 (date only) retained; image-only PDF does not establish exact time or live GeM status. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf) |
| 7 | GEM/2026/B/8010657<br>MacroMedics® BreastBoard™ SX along with associated accessories on a PAC basis. Bid No - GEM/2026/B/8010657 | UPDATED | Official PDF gives 09 Oct 2026 14:00 IST; same date as mirror, minute precision recovered. Mirror verification remains listing. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9863281%20%284%29.pdf) |
| 8 | GEM/2026/B/7946719<br>Optical Colposcope for Department of Obs Gynae Department - (GEM/2026/B/7946719) | UPDATED | Official PDF gives 08 Oct 2026 13:00 IST; same date as mirror, minute precision recovered. Mirror verification remains listing. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/Coloscope%20bid.pdf) |
| 9 | GEM/2026/B/7421096<br>GeM tender for the Procurement of Endoscopic Spine System for the Department of Orthopaedics GeM bid No. GEM/2026/B/7421096. | REMOVED | Removed from active only → DEADLINE_UNKNOWN. Mirror 09 Nov 2026 (date only) conflicts with original PDF 09 May 2026 17:00 IST; no linked amendment resolves it. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-05/GeM%20tender%20for%20the%20Procurement%20of%20Endoscopic%20Spine%20System%20for%20the%20Department%20of%20Orthopaedics%20GeM%20bid%20No.%20GEM-2026-B-7421096..pdf) |
| 10 | GEM/2026/B/7439204<br>GeM tender for the Procurement of Double Lumen Dialysis Catheter for the Department of Nephrology and Dialysis, AIIMS Bilaspur (H.P.) Vide GeM bid No. | REMOVED | Removed from active only → DEADLINE_UNKNOWN. Mirror 11 Nov 2026 (date only) conflicts with original PDF 11 May 2026 16:00 IST; no linked amendment resolves it. Recovered GEM/2026/B/7439204. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-05/GeM%20tender%20for%20the%20Procurement%20of%20Double%20Lumen%20Dialysis%20Catheter%20for%20the%20Department%20of%20Nephrology%20and%20Dialysis%2C%20AIIMS%20Bilaspur%20%28H.P.%29%20Vide%20GeM%20bid%20No..pdf) |
| 11 | GEM/2026/B/7410483<br>GeM tender for the Procurement of Target Controlled Infusion Pumps for the Dept. of Anaesthesiology, AIIMS Bilaspur (H.P.) | REMOVED | Removed from active only → DEADLINE_UNKNOWN. Mirror 11 Nov 2026 (date only) conflicts with original PDF 11 May 2026 17:00 IST; no linked amendment resolves it. Recovered GEM/2026/B/7410483. | [Official evidence](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-05/GeM%20tender%20for%20the%20Procurement%20of%20Target%20Controlled%20Infusion%20Pumps%20for%20the%20Dept.%20of%20Anaesthesiology%2C%20AIIMS%20Bilaspur%20%28H.P.%29.pdf) |
| 12 | 2026_PGIME_918371_1<br>Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | VERIFIED | Detail ID/scope and 08 Oct 2026 12:00 IST confirmed; 2 published corrigendum views read. | [Official evidence](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SUE%2BfIRQ0gb75WQ%2Bu9%2BNWsQ%3D%3D) |
| 13 | 2026_PGIME_918563_1<br>Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | VERIFIED | Detail ID/scope and 08 Oct 2026 12:00 IST confirmed; 2 published corrigendum views read. | [Official evidence](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=Swvxo475VlHq6gLnyMDqknw%3D%3D) |
| 14 | 2026_DMER_175641_1<br>PACEMAKERS | VERIFIED | Detail ID/scope and 05 Oct 2026 16:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S1BNcKer1xwKV2j3geFbJHg%3D%3D) |
| 15 | 2026_DMER_173744_1<br>Purchase of brachytherapy machine | UPDATED | Detail ID/scope and 06 Oct 2026 15:00 IST confirmed; 2 published corrigendum views read. Previously listing-only; detail and date/technical amendments now read. | [Official evidence](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMzsYWGqKpAcOQofNybWjeg%3D%3D) |
| 16 | 2026_DHFW_174757_1<br>Procurement of Electricl Suction Machine | VERIFIED | Detail ID/scope and 05 Oct 2026 16:00 IST confirmed; 1 published corrigendum views read. | [Official evidence](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMfb%2BInwhr5ryKdzxP76NmA%3D%3D) |
| 17 | 2026_GMCC_144757_1<br>UV-VIS Spectrophotometer and Fluorescent Microscope for establishment of VRDL Lab | VERIFIED | Detail ID/scope and 23 Oct 2026 11:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SCDutbJLMaZ9TS2ZZR23wpA%3D%3D) |
| 18 | 2026_IGMC1_144487_1<br>E-TENDER FOR THE PROCUREMENT OF ELECTROSURGICAL UNIT WITH VESSEL SEALING AND BIPOLAR FOR NEUROSURGERY DEPARTMENT (TRAUMA CENTRE), IGMC SHIMLA | VERIFIED | Detail ID/scope and 28 Oct 2026 14:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S3uUGPxzPmWMd6hhORW7WTA%3D%3D) |
| 19 | 2026_AIMS_144150_1<br>Procurement of Spy Glass Digital Controller | UPDATED | Detail ID/scope and 13 Oct 2026 14:00 IST confirmed; 0 published corrigendum views read. ENDOSCOPY retained; remove generic KARL STORZ opportunity: proprietary Boston Scientific SpyGlass. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=ScZBfTIbS2YN7dbi0cmX9wQ%3D%3D) |
| 20 | 2026_DMER5_143416_1<br>Mahinery and equipment for Deptt of Pathology under DIAMONDS project | VERIFIED | Detail ID/scope and 03 Oct 2026 13:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S191rxvMd9JgYsac1gi7SSg%3D%3D) |
| 21 | 2026_HPMSC_143790_1<br>Rate Contract of 256 SLICE CT SCANER | UPDATED | Detail ID/scope and 14 Oct 2026 15:00 IST confirmed; 0 published corrigendum views read. CT retained; remove Samsung generic opportunity: fixed 256-slice scope is outside configured mobile/portable CT portfolio. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SR572qxjL2ET1sFYNSH1iLg%3D%3D) |
| 22 | 2026_HPMSC_143796_1<br>Rate Contract of Colour Doppler Ultrasound Machines (Fully Loaded) | VERIFIED | Detail ID/scope and 14 Oct 2026 15:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SDUW009K7td7YKZZ%2F7%2BxpKg%3D%3D) |
| 23 | 2026_HPMSC_143799_1<br>Rate Contract of Digital Radiography Machine | VERIFIED | Detail ID/scope and 14 Oct 2026 15:00 IST confirmed; 0 published corrigendum views read. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SxK7Xwk5wwtwjzeMy6IJ5Ig%3D%3D) |
| 24 | 2026_HPMSC_143056_1<br>Procurement of Digital Mammography Machine for Pt. JLNGMC Chamba | UPDATED | Detail ID/scope and 07 Oct 2026 15:00 IST confirmed; 1 published corrigendum views read. Previously timed-out detail and technical amendment now read; Chamba assignment confirmed. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SEsgTfEv%2FkTGsluWkWYE4yA%3D%3D) |
| 25 | 2026_HPMSC_141463_1<br>Procurement of Digital PET/CT Scanner 128 Slice | UPDATED | Detail ID/scope and 03 Oct 2026 15:00 IST confirmed; 2 published corrigendum views read. Correct consignee scope: Hamirpur + Tanda, multi-institution; previously Hamirpur only. Previously timed-out detail now read. Hybrid PET/CT → DIAGNOSTIC_IMAGING; remove standalone CT inference and Samsung generic opportunity. | [Official evidence](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SgUO2xksgfP6Bd5Ls5MXc2g%3D%3D) |

Actions after combining source checks, deadline precision and portfolio corrections: 10 VERIFIED, 12 UPDATED, 3 REMOVED from active results. The final refresh may have different application statuses if retrieval fails or a source changes.

## Fresh source evidence and completeness

These counts are from the individual audit fetches. They must not be substituted for the final production refresh counts.

| Source | Fresh official evidence | Listing/pagination result | Amendment and coverage limits |
| --- | --- | --- | --- |
| CPPP / PGIMER | HTTP 200 organisation index, listing, 2 relevant details and 4 corrigendum views | 21 declared active rows / 21 parsed, one organisation listing response; no genuine next-page control | Each baseline detail has a date and a technical amendment view; HTML critical dates agree on 8 October noon. CAPTCHA-gated PDF content was not downloaded. |
| Punjab DMER | HTTP 200 index/list, 2 relevant details and 2 corrigendum views | 9/9 active organisation rows; no genuine pagination control | Brachytherapy date and technical views checked. Pacemaker detail has no published corrigendum table entries. |
| Punjab Health / PHSC | HTTP 200 index/list, 1 relevant detail and 1 date amendment view | 24/24 active organisation rows; no genuine pagination control | Suction-machine scope remains statewide: PHSC, SAS Nagar is the buyer location, not evidence of a particular medical-college consignee. |
| HP DMER | HTTP 200 index/list and all 4 baseline details; additional orthopedic detail checked | 22/22 active organisation rows; no genuine pagination control | No published corrigendum entries on the 4 baseline details. No SLBS/Nerchowk row appears in this central active listing; institution GeM/NIQ notices remain separate coverage. |
| HPMSCL | HTTP 200 index/list, all 5 baseline details and 3 corrigendum views | 6/6 active organisation rows; no genuine pagination control | Mammography technical amendment and PET/CT date/technical amendments read. Previously failed mammography/PET details were recoverable on fresh audit requests. PDFs remain CAPTCHA gated. |
| HP PWD | HTTP 200 index and complete organisation listing | 621/621 active rows; no genuine pagination control | 11 named target-institution rows are facility/civil/elevator/heating works, all rejected as nonmedical equipment. Includes 2 SLBS facility works. Zero medical-equipment candidates is not zero procurement. |
| AIIMS Bilaspur GeM mirror | HTTP 200; 2 listing pages | 133 parsed rows, 133 listed deadlines, 139 document links, 7 amendment links, 0 unreadable rows or linked pages left unchecked | All 6 baseline active attachments retrieved. Five text-readable PDFs supplied identity/date evidence; one is an image scan. Three May-vs-November conflicts cannot support active status without an amendment. |
| AIIMS Bilaspur CPPP mirror | HTTP 200; 1 listing page | 14 parsed rows, all with listed deadlines, 19 document links, 5 amendment links; no unreadable rows or linked pages left unchecked | Sample drug-rate-contract amendment deletes an item, not the deadline. This mirror is distinct from an independent full CPPP organisation audit. |
| AIIMS Bilaspur NIQ mirror | HTTP 200; 2 listing pages | 127 parsed rows, 126 listed deadlines, 1 unknown deadline, 134 document links, 3 amendment links; no unreadable rows or linked pages left unchecked | Biochemistry duplicate/malformed listing checked against PDF: 14 May 2026 15:00, expired. Old treadmill/bicycle amendment scans lack extractable text; newer submission amendments remain unverified. |
| AIIMS Bathinda | Fresh official mirror and 6 PDFs retrieved; 208 parsed records in source audit | All 5 baseline active PDFs supplied precise labelled submission times; 0 unavailable PDFs in that audit | Mirror date agrees with these 5 PDFs, but live GeM cancellation and subsequent amendments are not exhaustively checked. DVT pump row previously unknown is separately resolved to an expired 18 September noon deadline. |
| BFUHS / GGSMCH | Official ASP.NET listing and observed View action/document route; 12 scanned PDFs visually reviewed | Baseline had 151 unknown-deadline BFUHS rows; only matching reviewed documents get recovered dates | Unreviewed archive deadlines stay unknown. Recent document retrieval is bounded to 12 relevant records per refresh. Repair-of-microscope scan shows replacement 7 October 2026, 17:00; no assumption that an old publication is closed. |
| GMC Patiala institution site | Official listing retrieved at https://tenders.gmcpatiala.edu.in/ | No current relevant active row at audit; most recent displayed closing date 17 July 2026 | Displayed “Active” tags also occur on older expired dates; explicit closing date controls status. Punjab DMER coverage remains separate. |
| GMC Amritsar institution site | Official notice/PDF inspection | Admission/forms row rejected as education rather than procurement; ELISA scan shows 13 August 2026 16:00 | Observed PDF redirect accepted only for the exact matching tenant document path. The original scan does not establish exhaustive subsequent-amendment coverage. |
| SLBS institution site | Both official www/non-www routes attempted; unavailable, non-www HTTP 502 | No readable institution listing; no successful empty refresh asserted | Bounded alternate-host attempt added. Complete HP DMER and PWD listing checks provide separate, explicitly limited central coverage. |
| ESIC office-notice site | Official /tenders, /tenders/index, www root/tenders, Ludhiana root/tenders and esichospitals.gov.in attempted; all HTTP 502 | No readable office listing; zero cannot be asserted | Source remains unavailable. No CAPTCHA/login bypass or guessed API route. |
| CPPP / ESIC Ludhiana alternate | Fresh official ESIC organisation link HTTP 200 | 57 declared / 57 parsed rows; zero Ludhiana matches in title/organisation chain | Added as a separate source for ordinary CPPP tenders. Zero matches is not evidence of zero GeM-only bids, office notices, or document-only consignees. |
| Direct GeM search | No verified reliable automated public interface | Explicitly unavailable | Official institution GeM mirrors remain the supported discovery route; direct GeM status is not fabricated. |

NIC production traversal remains bounded to 8 organisation chains, 12 relevant detail checks and 2 relevant amendment views per tender, with incompleteness reported. Audit collection read every published corrigendum view for the baseline rows: 10 HTML views in total, including document publication dates, current critical dates and historical “Details Before Corrigendum” sections. Historical dates are not applied as current deadlines. Corrigendum detail must repeat the expected tender ID; missing or mismatched identity now prevents another tender's deadline from being applied.

A cookie-free HP public detail request with `session` omitted returned the correct tender. Forcing `session=T` without the current session cookie returned the official expired-session page. Public saved detail URLs omit the transient session query; internal traversal uses the current scoped cookie. This test supports the URL choice, not permanent availability of every portal link.

Bilaspur production listing pagination is capped at 10 pages and document checks at 12 relevant records; untraversed pages/deferred documents are reported rather than hidden. Source budgets and response-size limits remain bounded. The audit's observed complete listing traversal does not imply an exhaustive review of every archive attachment.

## Confirmed fixes and evidence boundaries

The shared labelled-deadline reader accepts submission/end/closing/last-date fields, rejects download/opening dates, handles bilingual GeM labels and prefers an explicitly revised deadline. Conflicting labelled dates yield unknown. Date-only deadlines include the whole Indian calendar day; explicit time remains precise. A reliable original PDF can refine a same-day mirror date but cannot silently override a different calendar day without amendment evidence.

GeM PDFs contain discovery/report terms, searched strings, notification categories, supplier eligibility and generic administrative clauses unrelated to the purchased product. Feeding an entire PDF into taxonomy/portfolio matching introduced unrelated categories and brand opportunities. The shared `productEvidence` helper uses declared Item Category and technical/product/item-specification sections as GeM product evidence and stops at discovery/administrative boundaries; plain procurement titles/descriptions remain evidence. Generic portal/history/help clauses do not create medical or portfolio scope. Explicit manufacturer/model mentions remain separate from generic configured portfolio opportunities.

The individual portfolio review removed a generic KARL STORZ opportunity from proprietary Boston Scientific SpyGlass, removed a Samsung opportunity from fixed 256-slice CT, and classified hybrid PET/CT as diagnostic imaging rather than standalone CT with a Samsung inference. Manufacturer checks: [Boston Scientific SpyGlass](https://www.bostonscientific.com/en-IN/products/direct-visualization-systems/spyglass-ds-direct-visualization-system.html), [BodyTom](https://www.neurologica.com/hubfs/BTB.pdf), [OmniTom](https://www.neurologica.com/hubfs/OmniTom_Brochure_rev02.pdf). No baseline clinical record was rejected merely because its portfolio changed.

Image-only documents are handled through reviewed metadata containing the exact official URL, SHA-256, visually observed field, precision, review date, legibility note and institution/reference where directly evidenced. Metadata applies only after freshly fetched PDF bytes match both URL and hash. It is not a seeded live status or substitute for amendment retrieval. The PDF parser transferred/detached its input buffer; copying bytes before PDF.js extraction preserves the original download for content-hash verification. A changed document cannot inherit a previously transcribed deadline.

Additional verified recall cases are outside the 25-row baseline table: [IGMC orthopedic equipment, 2026_IGMC1_144483_1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S4mW1kgU8i%2Fuy2Aleg%2BTULg%3D%3D), official deadline 28 October 2026 14:00; and [Bilaspur Ammonia Kits/Controls, GEM/2026/B/8044087](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9901742_0.pdf), official item Biochemistry Reagent Kit for Human Samples, deadline 7 October 2026 16:00. Narrow clinical-department/kit vocabulary fixes recover these without guessing a brand.

## Evidence and validation record

Inputs: `baseline-active.json`, `baseline-data.json`, `nic-audit.json`, `bilaspur-audit.json`, `institution-audit.json`, `classification-audit.json`, `reviewed-scans.json` and `classification-review-notes.md` in the task's audit workspace. Fresh HTML/PDF evidence and extracted text are retained there. This report summarizes observed fields rather than embedding raw response payloads.

Focused NIC/ESIC verification passed 13 tests, including mismatched/missing corrigendum tender identity, valid revised critical dates, genuine zero counts and challenged alternate responses. Classification/portfolio verification passed its 126-test focused suite and a typecheck at that point. These are interim results; final integrated tests/build, refreshed data counts and browser/server checks belong in the production snapshot below.

The security review found server-only token/Redis access, authenticated refresh checks and no client persistence of refresh tokens. It found no arbitrary HTML rendering in source components and no named server secrets in the inspected 23 built client JavaScript files at that point. Raw transport diagnostic error sanitation was assigned to the root implementation review. These interim findings do not claim a completed Vercel deployment or final build inspection.

## Final production snapshot

Validated at **01 Oct 2026, 16:34 IST**. This is the final protected refresh of the built Next.js application, not an independent best-case source run. Failed-source rows retained from compatible snapshots are marked stale with their previous verification time. All counts are observations; source outages and deadlines change at runtime.

### Before → after

| Metric | Baseline | Final refresh |
| --- | --- | --- |
| Institutions configured | 23 | 23 |
| Adapters attempted | 18 | 19 |
| SUCCESS | 6 | 6 |
| PARTIAL | 8 | 9 |
| UNAVAILABLE | 4 | 4 |
| Raw source records | 3029 | 3718 |
| Institution-matched raw records | 748 | 774 |
| Medical rows before deduplication | 292 | 296 |
| ACTIVE_VERIFIED | 11 | 6 |
| ACTIVE_LIKELY | 14 | 20 |
| DEADLINE_UNKNOWN | 154 | 144 |
| Expired / excluded by default | 105 | 118 |
| Cancelled / withdrawn | 0 | 0 |
| Nonmedical rejected | 2576 | 2585 |
| Unassigned rejected | 161 | 837 |
| Duplicates removed | 8 | 8 |
| Total active | 25 | 26 |
| Active matching at least one of seven portfolios | — | 9 |
| Institutions with active results | 10 | 11 |
| Active statewide | 4 | 4 |

The change combines genuine recalled records, corrected deadlines/scope/portfolios and variable source availability. Raw record growth alone is not an opportunity improvement. Baseline and final source-status differences reflect observed outages; no failed source is labelled successful.

### Final source results

| Adapter | Status | Raw | Matched | Medical | Detail checks | Last success IST | Stale | Current limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aiims-bathinda | SUCCESS | 208 | 208 | 63 | 0 | 01 Oct 2026, 16:32 IST | False | Official institutional mirror; 6 of 6 bounded relevant PDFs inspected (0 unavailable). Separate portal amendments may change the published deadline. |
| aiims-bilaspur-gem | PARTIAL | 133 | 133 | 38 | 8 | 01 Oct 2026, 16:32 IST | False | An attached document could not be read or its deadline could not be verified; affected tender retains listing verification.; An attached document could not be read or its deadline could not be verified; affected tender retains listing verification.; Some attached corrigenda require document review for current deadlines. |
| aiims-bilaspur-cppp | PARTIAL | 14 | 14 | 0 | 0 | 01 Oct 2026, 16:32 IST | False | Some attached corrigenda require document review for current deadlines. |
| aiims-bilaspur-niq | PARTIAL | 127 | 127 | 26 | 1 | 01 Oct 2026, 16:32 IST | False | An attached document could not be read or its deadline could not be verified; affected tender retains listing verification.; Some attached corrigenda require document review for current deadlines. |
| cppp-pgimer | PARTIAL | 24 | 24 | 2 | 1 | 01 Oct 2026, 16:32 IST | False | Detail verification failed for 2026_PGIME_918371_1: Official source timed out; Corrigendum verification failed for 2026_PGIME_918563_1: Official source timed out; Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| punjab-dmer | PARTIAL | 9 | 7 | 2 | 0 | 01 Oct 2026, 16:33 IST | False | Detail verification failed for 2026_DMER_175641_1: Official source timed out; Detail verification failed for 2026_DMER_173744_1: Official source timed out; Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| punjab-phsc | SUCCESS | 22 | 0 | 1 | 1 | 01 Oct 2026, 16:33 IST | False | Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| punjab-pidb | SUCCESS | 1 | 0 | 0 | 0 | 01 Oct 2026, 16:33 IST | False | Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| chandigarh-eproc | SUCCESS | 171 | 9 | 0 | 0 | 01 Oct 2026, 16:33 IST | False | Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| hp-dmer | PARTIAL | 22 | 22 | 5 | 0 | 01 Oct 2026, 16:33 IST | False | Detail verification failed for 2026_GMCC_144757_1: Official source timed out; Detail verification failed for 2026_AIMS_144150_1: Official source timed out; Detail verification failed for 2026_DMER5_143416_1: Official source timed out; Detail verification failed for 2026_IGMC1_144483_1: Official source timed out; Detail verification failed for 2026_IGMC1_144487_1: Official source timed out; Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| hpmscl | SUCCESS | 6 | 2 | 5 | 5 | 01 Oct 2026, 16:33 IST | False | Read 1 matching official organisation chains without login or CAPTCHA bypass. |
| hp-pwd | UNAVAILABLE | 627 | 11 | 0 | 0 | 01 Oct 2026, 16:30 IST | True | No complete official organisation listing could be read; Organisation fetch failed: Official source timed out; Source unavailable; previously checked records retained. Last verified dates have not been advanced. |
| bfuhs | PARTIAL | 2193 | 114 | 152 | 0 | 01 Oct 2026, 16:34 IST | False | University-wide procurement; 12 of 12 bounded recent relevant PDFs inspected (0 unavailable). Unverified consignees remain statewide; unknown deadlines are never inferred. Archive documents outside this bounded check remain visible with unknown deadlines. |
| gmc-patiala | PARTIAL | 93 | 93 | 1 | 0 | 01 Oct 2026, 16:33 IST | False | Official institutional mirror; 0 of 0 bounded relevant PDFs inspected (0 unavailable). Separate portal amendments may change the published deadline. |
| gmc-amritsar | PARTIAL | 10 | 10 | 1 | 0 | 01 Oct 2026, 16:34 IST | False | Official institutional mirror; 1 of 1 bounded relevant PDFs inspected (0 unavailable). Separate portal amendments may change the published deadline. |
| slbsgmc | UNAVAILABLE | 0 | 0 | 0 | 0 | — | False | Official source HTTP 502 |
| esic | UNAVAILABLE | 0 | 0 | 0 | 0 | — | False | Official listing could not be retrieved or its format changed |
| cppp-esic | SUCCESS | 58 | 0 | 0 | 0 | 01 Oct 2026, 16:34 IST | False | Read 1 matching official organisation chains without login or CAPTCHA bypass.; Checks public CPPP ESIC organisation tenders for Ludhiana; GeM-only and ESIC office-notice coverage remain separate. |
| gem-direct | UNAVAILABLE | 0 | 0 | 0 | 0 | — | False | Direct automated GeM search is not a verified reliable public interface. Official institution GeM mirrors are fetched separately.; No authentication or CAPTCHA automation. No guessed GeM API endpoints. |

### All 23 institutions

Shared raw totals below are all rows in each configured source, **not** tenders assigned to the institution. Matched/medical counts are raw rows assigned by aliases/context before deduplication; active/unknown/expired counts are unique normalized results. A zero with incomplete coverage is not proof of no tenders.

| Institution | Region | Type / status | Sources | Shared raw | Matched | Medical | Verified | Likely | Unknown | Expired | Rejected | Deduped | Coverage finding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PGIMER Chandigarh | Chandigarh | central-government / operational | cppp-pgimer: PARTIAL | 24 | 26 | 2 | 0 | 2 | 0 | 0 | 24 | 0 | Active records found in retrieved coverage. |
| GMCH Chandigarh | Chandigarh | state-government / operational | chandigarh-eproc: SUCCESS | 171 | 7 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | No matching active records in retrieved coverage; unmirrored/GeM-only procurement may still be absent from these sources. |
| AIIMS Bathinda | Punjab | central-government / operational | aiims-bathinda: SUCCESS | 208 | 208 | 63 | 0 | 5 | 0 | 57 | 145 | 1 | Active records found in retrieved coverage. |
| ESIC Ludhiana | Punjab | central-government / operational | esic: UNAVAILABLE, cppp-esic: SUCCESS | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| PGIMER Ferozepur | Punjab | central-government / operational | cppp-pgimer: PARTIAL | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| GMC Patiala | Punjab | state-government / operational | punjab-dmer: PARTIAL, gmc-patiala: PARTIAL | 102 | 96 | 2 | 0 | 1 | 0 | 1 | 94 | 0 | Active records found in retrieved coverage. |
| GMC Amritsar | Punjab | state-government / operational | punjab-dmer: PARTIAL, gmc-amritsar: PARTIAL | 19 | 12 | 2 | 0 | 1 | 0 | 1 | 10 | 0 | Active records found in retrieved coverage. |
| GGSMCH Faridkot | Punjab | state-government / operational | bfuhs: PARTIAL, punjab-dmer: PARTIAL | 2202 | 116 | 16 | 0 | 2 | 4 | 10 | 100 | 0 | Active records found in retrieved coverage. |
| AIMS Mohali | Punjab | state-government / operational | punjab-dmer: PARTIAL | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| SIMS Hoshiarpur | Punjab | government-project / project-stage | punjab-dmer: PARTIAL, punjab-pidb: SUCCESS | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| SIMS Kapurthala | Punjab | government-project / project-stage | punjab-dmer: PARTIAL, punjab-pidb: SUCCESS | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| Sangrur medical-college project | Punjab | government-ppp-project / project-stage | punjab-pidb: SUCCESS, punjab-dmer: PARTIAL | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| SBS Nagar medical-college project | Punjab | government-ppp-project / project-stage | punjab-pidb: SUCCESS, punjab-dmer: PARTIAL | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| Malerkotla medical-college project | Punjab | government-project / project-stage | punjab-dmer: PARTIAL, punjab-pidb: SUCCESS | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| AIIMS Bilaspur | Himachal Pradesh | central-government / operational | aiims-bilaspur-gem: PARTIAL, aiims-bilaspur-cppp: PARTIAL, aiims-bilaspur-niq: PARTIAL | 274 | 274 | 64 | 0 | 4 | 4 | 49 | 210 | 7 | Active records found in retrieved coverage. |
| IGMC Shimla | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS, hp-pwd: UNAVAILABLE | 655 | 13 | 2 | 0 | 2 | 0 | 0 | 11 | 0 | Active records found in retrieved coverage. |
| AIMSS Chamiana | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS, hp-pwd: UNAVAILABLE | 655 | 2 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | Active records found in retrieved coverage. |
| Dr RPGMC Tanda | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS | 28 | 11 | 2 | 1 | 1 | 0 | 0 | 9 | 0 | Active records found in retrieved coverage. |
| SLBSGMCH Nerchowk | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS, slbsgmc: UNAVAILABLE | 28 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| Dr YSPGMC Nahan | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS | 28 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |
| Pt JLNGMC Chamba | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS | 28 | 3 | 2 | 1 | 1 | 0 | 0 | 1 | 0 | Active records found in retrieved coverage. |
| Dr RKGMC Hamirpur | Himachal Pradesh | state-government / operational | hp-dmer: PARTIAL, hpmscl: SUCCESS | 28 | 4 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | Active records found in retrieved coverage. |
| Mastuana Sahib medical-institute project | Punjab | government-project / project-stage | punjab-dmer: PARTIAL | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | No matching active records in retrieved coverage; partial/unavailable sources prevent a complete absence claim. |

### Every remaining active opportunity

`ACTIVE_VERIFIED` requires fresh detail/amendment verification in the current adapter check; `ACTIVE_LIKELY` includes mirror-only or stale/incomplete checks. Date-only deadlines are explicitly shown without fabricated exact times. Portfolio relevance is not eligibility. The official tender/document links below are the actually retrieved records, not private aggregators or invented direct-GeM links.

| Institution / region / scope | Title | Tender ID / reference | Source | Effective close IST | Status | Categories | Portfolio / explicit matches | Last checked IST | Official links |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GGSMCH Faridkot / Punjab / institution | Quotations for Purchase of Operation Table Mattress Cover & Stretcher Trolley | MSO/Pur/2026/23771 | BFUHS / GGSMCH notices | 01 Oct 2026, 17:00 IST | ACTIVE_LIKELY | STRETCHERS | LINET (portfolio) | 01 Oct 2026, 16:33 IST | [Official tender](https://examination.bfuhsonline.ac.in/onlinetender/tenderview.aspx); [Document 1](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5368.pdf) |
| Dr RPGMC Tanda / Himachal Pradesh / institution | Mahinery and equipment for Deptt of Pathology under DIAMONDS project | 2026_DMER5_143416_1 | Himachal eProcurement / DMER | 03 Oct 2026, 13:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S191rxvMd9JgYsac1gi7SSg%3D%3D) |
| Dr RPGMC Tanda, Dr RKGMC Hamirpur / Himachal Pradesh / multi-institution | Procurement of Digital PET/CT Scanner 128 Slice | 2026_HPMSC_141463_1 | Himachal eProcurement / HPMSCL | 03 Oct 2026, 15:00 IST | ACTIVE_VERIFIED | DIAGNOSTIC_IMAGING, OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:33 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SgUO2xksgfP6Bd5Ls5MXc2g%3D%3D); [Document 1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SgUO2xksgfP6Bd5Ls5MXc2g%3D%3D) |
| GMC Amritsar / Punjab / institution | PACEMAKERS | 2026_DMER_175641_1 | Punjab eProcurement / DMER | 05 Oct 2026, 16:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S1BNcKer1xwKV2j3geFbJHg%3D%3D) |
| Statewide / Punjab / statewide | Procurement of Electricl Suction Machine | 2026_DHFW_174757_1 | Punjab eProcurement / Health & PHSC | 05 Oct 2026, 16:00 IST | ACTIVE_VERIFIED | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMfb%2BInwhr5ryKdzxP76NmA%3D%3D); [Document 1](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMfb%2BInwhr5ryKdzxP76NmA%3D%3D) |
| GMC Patiala / Punjab / institution | Purchase of brachytherapy machine | 2026_DMER_173744_1 | Punjab eProcurement / DMER | 06 Oct 2026, 15:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMzsYWGqKpAcOQofNybWjeg%3D%3D) |
| Pt JLNGMC Chamba / Himachal Pradesh / institution | Procurement of Digital Mammography Machine for Pt. JLNGMC Chamba | 2026_HPMSC_143056_1 | Himachal eProcurement / HPMSCL | 07 Oct 2026, 15:00 IST | ACTIVE_VERIFIED | DIAGNOSTIC_IMAGING, OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:33 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SEsgTfEv%2FkTGsluWkWYE4yA%3D%3D); [Document 1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SEsgTfEv%2FkTGsluWkWYE4yA%3D%3D) |
| AIIMS Bilaspur / Himachal Pradesh / institution | GeM Bid for Procurement of Ammonia Kits and Controls – Department of Biochemistry | GEM/2026/B/8044087 | AIIMS Bilaspur GeM | 07 Oct 2026, 16:00 IST | ACTIVE_LIKELY | LAB_IVD | None identified | 01 Oct 2026, 16:31 IST | [Official tender](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9901742_0.pdf); [Document 1](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9901742_0.pdf) |
| GGSMCH Faridkot / Punjab / institution | Quotation for repair of Microscope | Pur/2026/27830 | BFUHS / GGSMCH notices | 07 Oct 2026, 17:00 IST | ACTIVE_LIKELY | LAB_IVD | None identified | 01 Oct 2026, 16:33 IST | [Official tender](https://examination.bfuhsonline.ac.in/onlinetender/tenderview.aspx); [Document 1](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5400.pdf) |
| PGIMER Chandigarh / Chandigarh / institution | Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | 2026_PGIME_918371_1 | CPPP / PGIMER | 08 Oct 2026, 12:00 IST | ACTIVE_LIKELY | LAPAROSCOPY, ELECTROSURGERY | KARL STORZ (portfolio); Skanray (portfolio) | 01 Oct 2026, 16:31 IST | [Official tender](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SUE%2BfIRQ0gb75WQ%2Bu9%2BNWsQ%3D%3D) |
| PGIMER Chandigarh / Chandigarh / institution | Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | 2026_PGIME_918563_1 | CPPP / PGIMER | 08 Oct 2026, 12:00 IST | ACTIVE_LIKELY | LAPAROSCOPY, ELECTROSURGERY, OTHER_MEDICAL_EQUIPMENT | KARL STORZ (portfolio); Skanray (portfolio) | 01 Oct 2026, 16:31 IST | [Official tender](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=Swvxo475VlHq6gLnyMDqknw%3D%3D); [Document 1](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=Swvxo475VlHq6gLnyMDqknw%3D%3D) |
| AIIMS Bilaspur / Himachal Pradesh / institution | Optical Colposcope for Department of Obs Gynae Department - (GEM/2026/B/7946719) | GEM/2026/B/7946719 | AIIMS Bilaspur GeM | 08 Oct 2026, 13:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:31 IST | [Official tender](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/Coloscope%20bid.pdf); [Document 1](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/Coloscope%20bid.pdf) |
| AIIMS Bathinda / Punjab / institution | EEG Machine (Q2) | GEM/2026/B/7953878 | AIIMS Bathinda GeM mirror | 08 Oct 2026, 17:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D); [Document 1](https://www.aiimsbathinda.edu.in/images/procurements/20260917101938.pdf) |
| AIIMS Bilaspur / Himachal Pradesh / institution | Laparocator with camera (GeM Bid No. GEM/2026/B/8047970) | GEM/2026/B/8047970 | AIIMS Bilaspur GeM | 08 Oct 2026 (date only; exact time unknown) | ACTIVE_LIKELY | LAPAROSCOPY | KARL STORZ (portfolio) | 01 Oct 2026, 16:31 IST | [Official tender](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf); [Document 1](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf) |
| AIIMS Bilaspur / Himachal Pradesh / institution | MacroMedics® BreastBoard™ SX along with associated accessories on a PAC basis. Bid No - GEM/2026/B/8010657 | GEM/2026/B/8010657 | AIIMS Bilaspur GeM | 09 Oct 2026, 14:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:31 IST | [Official tender](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9863281%20%284%29.pdf); [Document 1](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9863281%20%284%29.pdf) |
| AIMSS Chamiana / Himachal Pradesh / institution | Procurement of Spy Glass Digital Controller | 2026_AIMS_144150_1 | Himachal eProcurement / DMER | 13 Oct 2026, 14:00 IST | ACTIVE_LIKELY | ENDOSCOPY | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=ScZBfTIbS2YN7dbi0cmX9wQ%3D%3D) |
| AIIMS Bathinda / Punjab / institution | Flat Panel C-arm Machine | GEM/2026/B/7889626 | AIIMS Bathinda GeM mirror | 13 Oct 2026, 16:00 IST | ACTIVE_LIKELY | C_ARM | Skanray (portfolio) | 01 Oct 2026, 16:32 IST | [Official tender](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D); [Document 1](https://www.aiimsbathinda.edu.in/images/procurements/20260925014316.pdf) |
| AIIMS Bathinda / Punjab / institution | Electrocautery Machine (V2) (Q2) | GEM/2026/B/8034327 | AIIMS Bathinda GeM mirror | 13 Oct 2026, 16:00 IST | ACTIVE_LIKELY | ELECTROSURGERY | KARL STORZ (portfolio); Skanray (portfolio) | 01 Oct 2026, 16:32 IST | [Official tender](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D); [Document 1](https://www.aiimsbathinda.edu.in/images/procurements/20260925014718.pdf) |
| AIIMS Bathinda / Punjab / institution | CRRT Machine | GEM/2026/B/8028120 | AIIMS Bathinda GeM mirror | 13 Oct 2026, 16:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D); [Document 1](https://www.aiimsbathinda.edu.in/images/procurements/20260921045328.pdf) |
| Statewide / Himachal Pradesh / statewide | Rate Contract of 256 SLICE CT SCANER | 2026_HPMSC_143790_1 | Himachal eProcurement / HPMSCL | 14 Oct 2026, 15:00 IST | ACTIVE_VERIFIED | CT, OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:33 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SR572qxjL2ET1sFYNSH1iLg%3D%3D); [Document 1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SR572qxjL2ET1sFYNSH1iLg%3D%3D) |
| Statewide / Himachal Pradesh / statewide | Rate Contract of Colour Doppler Ultrasound Machines (Fully Loaded) | 2026_HPMSC_143796_1 | Himachal eProcurement / HPMSCL | 14 Oct 2026, 15:00 IST | ACTIVE_VERIFIED | ULTRASOUND, OTHER_MEDICAL_EQUIPMENT | Samsung Healthcare (portfolio) | 01 Oct 2026, 16:33 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SDUW009K7td7YKZZ%2F7%2BxpKg%3D%3D); [Document 1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SDUW009K7td7YKZZ%2F7%2BxpKg%3D%3D) |
| Statewide / Himachal Pradesh / statewide | Rate Contract of Digital Radiography Machine | 2026_HPMSC_143799_1 | Himachal eProcurement / HPMSCL | 14 Oct 2026, 15:00 IST | ACTIVE_VERIFIED | XRAY_DR, OTHER_MEDICAL_EQUIPMENT | Samsung Healthcare (portfolio); Skanray (portfolio) | 01 Oct 2026, 16:33 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SxK7Xwk5wwtwjzeMy6IJ5Ig%3D%3D); [Document 1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SxK7Xwk5wwtwjzeMy6IJ5Ig%3D%3D) |
| AIIMS Bathinda / Punjab / institution | Radiant Warmer | GEM/2026/B/7891714 | AIIMS Bathinda GeM mirror | 16 Oct 2026, 12:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D); [Document 1](https://www.aiimsbathinda.edu.in/images/procurements/20260923035403.pdf) |
| Pt JLNGMC Chamba / Himachal Pradesh / institution | UV-VIS Spectrophotometer and Fluorescent Microscope for establishment of VRDL Lab | 2026_GMCC_144757_1 | Himachal eProcurement / DMER | 23 Oct 2026, 11:00 IST | ACTIVE_LIKELY | LAB_IVD | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SCDutbJLMaZ9TS2ZZR23wpA%3D%3D) |
| IGMC Shimla / Himachal Pradesh / institution | E- tender fro the procurement of various equipement for Department of Orthopaedic surgery(Trauma Centre), IGMC Shimla. | 2026_IGMC1_144483_1 | Himachal eProcurement / DMER | 28 Oct 2026, 14:00 IST | ACTIVE_LIKELY | OTHER_MEDICAL_EQUIPMENT | None identified | 01 Oct 2026, 16:32 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S4mW1kgU8i%2Fuy2Aleg%2BTULg%3D%3D) |
| IGMC Shimla / Himachal Pradesh / institution | E-TENDER FOR THE PROCUREMENT OF ELECTROSURGICAL UNIT WITH VESSEL SEALING AND BIPOLAR FOR NEUROSURGERY DEPARTMENT (TRAUMA CENTRE), IGMC SHIMLA | 2026_IGMC1_144487_1 | Himachal eProcurement / DMER | 28 Oct 2026, 14:00 IST | ACTIVE_LIKELY | ELECTROSURGERY | KARL STORZ (portfolio); Skanray (portfolio) | 01 Oct 2026, 16:32 IST | [Official tender](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S3uUGPxzPmWMd6hhORW7WTA%3D%3D) |

### Unknown-deadline reduction

| Source | Baseline unknown | Final unknown |
| --- | --- | --- |
| aiims-bathinda | 1 | 0 |
| aiims-bilaspur-gem | 0 | 3 |
| aiims-bilaspur-niq | 0 | 1 |
| bfuhs | 151 | 140 |
| gmc-amritsar | 2 | 0 |

The BFUHS archive beyond the twelve-document check remains unknown. Recovered expired scans are excluded by default. The three contradictory Bilaspur records are intentionally unknown; removing a dubious active deadline can increase this count while improving accuracy.

### Seven portfolio counts

| Portfolio | Matching active opportunities |
| --- | --- |
| Samsung Healthcare | 2 |
| Hamilton Medical | 0 |
| KARL STORZ | 5 |
| LINET | 1 |
| Medcaptain | 0 |
| Spacelabs Healthcare | 0 |
| Skanray | 6 |

Counts overlap across brands. Zero is a result of this coverage and its current procurements, not lack of implementation; generic and explicit regression tests cover all seven portfolios.

### Final gates and production behavior

- `npm install`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS — 279 tests across 15 files.
- `npm run build`: PASS — Next.js 16.3.8, Node API routes.
- Credential-pattern scan and `git diff --check`: PASS.

| Production check | Result |
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

| Measured request | Milliseconds |
| --- | --- |
| initialReadMs | 155799 |
| forcedRefreshMs | 174704 |
| cachedReadMs | 567 |
| browserCachedRefreshMs | 404 |

Administrator POST returns 202 and invalidates snapshots; the subsequent GET performs official reads. A following GET retains identical source-attempt timestamps. Public Refresh reads the current cache. Missing/incorrect credentials return 401 and cross-origin requests return 403. The BFUHS route returned actual PDF bytes. Diagnostics contains all 23 institutions and no test token. Development-only Chromium verifies the UI; it is not shipped as a source scraper.

The first final refresh exposed an incompatible pre-audit snapshot resurrecting a disputed spine deadline during an outage. Next and optional Redis cache namespaces were advanced so pre-audit records cannot enter the revised pipeline. Known Bilaspur conflicts are guarded by exact audited listing/document identity while no resolving amendment is established; document-fetch failures cannot re-enable those deadlines. New compatible snapshots can still retain legitimate previously checked records on failures.

### Deployment and remaining limitations

The production build and single Next.js deployment structure pass the Vercel compatibility checks. **No live Vercel deployment has been performed or verified.** Import this repository using the Next.js preset and a Node runtime; cold reads can exceed 60 seconds and routes declare 300 seconds. Actual government-site connectivity from the Vercel region remains a deployment check.

Direct GeM querying remains unavailable; separate institution mirrors do not prove complete live GeM amendments. ESIC office/SLBS and intermittent NIC/Bilaspur outages remain visible per source above. Scanned or archive PDFs beyond reviewed/bounded documents keep unknown dates. CAPTCHA-gated BOQs and unlinked amendments are not read, and no OCR/authentication/CAPTCHA bypass is required. Without optional Redis, a cold instance with no compatible cache cannot recover previous successful records.

## PDF deployment trace verification

The final production build includes PDF worker modules and native polyfills in both tender and diagnostics API traces. Parsing a real official breast-board PDF from a separate directory containing only traced dependencies returned the correct GEM/2026/B/8010657 identity and 28,861 text characters. No full repository node_modules fallback was used. `npm run build` now checks these assets automatically. This packaging check ran after the browser refresh and changed no source adapter logic or data.
