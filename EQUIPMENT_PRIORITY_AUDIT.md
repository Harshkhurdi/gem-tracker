# Expanded equipment priority audit

Live source snapshot: 2026-10-02T09:03:54.068Z. Final rules reapplied to the same official source records after manual classification review.

All 25 configured source adapters were attempted: 12 successful listing reads, 12 partial, 1 unavailable. These are shared listing searches across Chandigarh, Punjab and Himachal Pradesh, including public GeM region/state/organisation searches, CPPP, state eProcurement, HPMSCL/PHSC/DMER/PIDB and institution mirrors. They do not establish complete portal coverage or a separate equipment keyword query for every category.

## Per-category observations

| Equipment | Sources attempted | Raw candidates | Nonmedical rejected | Category hints excluded | Active verified | Active likely | Unknown deadline | Technical documents found | Specs complete | Specs partial | Documents unavailable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ventilators | 25 | 23 | 0 | 0 | 0 | 1 | 2 | 6 | 0 | 3 | 0 |
| Ultrasound | 25 | 44 | 0 | 6 | 1 | 4 | 1 | 11 | 1 | 3 | 1 |
| Defibrillators | 25 | 7 | 0 | 0 | 0 | 2 | 1 | 6 | 0 | 2 | 1 |
| Hospital beds | 25 | 11 | 1 | 1 | 0 | 1 | 2 | 3 | 0 | 1 | 0 |
| Endoscopy | 25 | 58 | 1 | 2 | 3 | 3 | 14 | 10 | 1 | 3 | 3 |
| Mammography | 25 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Digital radiography / Mobile DR | 25 | 5 | 0 | 0 | 1 | 2 | 0 | 6 | 0 | 2 | 1 |
| C-arm | 25 | 6 | 0 | 1 | 0 | 1 | 0 | 3 | 0 | 1 | 0 |
| Syringe / Infusion pumps | 25 | 14 | 0 | 0 | 0 | 2 | 1 | 7 | 2 | 1 | 0 |
| Patient monitors | 25 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Patient / Fluid warmers | 25 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| OT lights | 25 | 5 | 0 | 0 | 0 | 1 | 4 | 5 | 0 | 3 | 0 |
| Anaesthesia machines | 25 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Raw candidates are alias signals in retained adapter records before normalized deduplication, including historical notices. Adapters may reject earlier portal results before this audit can count them. Nonmedical rejections and unsupported medical-category hints are separate; deduplication is not a false positive. Unknown counts include all retained unknown dates. Document/specification counts cover active and potentially current unknown records, not old archives. Complete describes the inspected document set, never compliance or exhaustive verification.

## Current classification review

Every currently active priority record in this snapshot was reviewed against its official title and, where available, its declared document item scope. The table records product classification; ACTIVE_LIKELY records still need official amendment/availability confirmation. Protected or unavailable documents were not treated as verified specifications.

| Tender | Official product title | Priority group | Deadline in IST | Extraction |
|---|---|---|---|---|
| [2026_PGIME_918371_1](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SUE%2BfIRQ0gb75WQ%2Bu9%2BNWsQ%3D%3D) | Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | ENDOSCOPY | 2026-10-08T12:00:00+05:30 | document-unavailable |
| [2026_PGIME_918563_1](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=Swvxo475VlHq6gLnyMDqknw%3D%3D) | Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery | ENDOSCOPY | 2026-10-08T12:00:00+05:30 | document-unavailable |
| [2026_AIMS_144150_1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=ScZBfTIbS2YN7dbi0cmX9wQ%3D%3D) | Procurement of Spy Glass Digital Controller | ENDOSCOPY | 2026-10-13T14:00:00+05:30 | document-unavailable |
| [GEM/2026/B/8049724](https://bidplus.gem.gov.in/showbidDocument/9907990) | Syringe Infusion Pump | INFUSION_PUMPS | 2026-10-24T17:00:00+05:30 | partial |
| [GEM/2026/B/8047970](https://bidplus.gem.gov.in/showbidDocument/9906064) | Laparocator with Camera | ENDOSCOPY | 2026-10-15T16:00:00+05:30 | partial |
| [2026_HPMSC_143796_1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SDUW009K7td7YKZZ%2F7%2BxpKg%3D%3D) | Rate Contract of Colour Doppler Ultrasound Machines (Fully Loaded) | ULTRASOUND | 2026-10-14T15:00:00+05:30 | document-unavailable |
| [2026_HPMSC_143799_1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SxK7Xwk5wwtwjzeMy6IJ5Ig%3D%3D) | Rate Contract of Digital Radiography Machine | DIGITAL_RADIOGRAPHY | 2026-10-14T15:00:00+05:30 | document-unavailable |
| [2026_HPMSC_143056_1](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SEsgTfEv%2FkTGsluWkWYE4yA%3D%3D) | Procurement of Digital Mammography Machine for Pt. JLNGMC Chamba | MAMMOGRAPHY | 2026-10-07T15:00:00+05:30 | document-unavailable |
| [GEM/2026/B/7889626](https://bidplus.gem.gov.in/showbidDocument/9723941) | Flat Panel C-arm Machine | C_ARM | 2026-10-13T16:00:00+05:30 | partial |
| [AIIMS Bathinda/Proc.Cell/2026/324](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=ydRRTTxkdt6Trx91pX1+cA%3D%3D&JnH7tY=ni6p7uJmUYh6NtRIoH1zej6ayg0V9vON2iB6aRQlYRo%3D) | Quotations for Ueretero-Renoscope for the Dept. of Urology, in AIIMS Bathinda | ENDOSCOPY | 2026-10-07T17:00:00+05:30 | partial |
| [GEM/2026/B/7797240](https://bidplus.gem.gov.in/showbidDocument/9618291) | Spine endoscopic with endoscopic spine instrument | ENDOSCOPY | 2026-10-07T14:00:00+05:30 | partial |
| [GEM/2026/B/7971024](https://bidplus.gem.gov.in/showbidDocument/9817600) | Portable Ultrasound Machine (V2) | ULTRASOUND | 2026-10-05T12:00:00+05:30 | complete |
| [GEM/2026/B/7987137](https://bidplus.gem.gov.in/showbidDocument/9836267) | Defibrillator | DEFIBRILLATORS | 2026-10-05T13:00:00+05:30 | partial |
| [GEM/2026/B/8005979](https://bidplus.gem.gov.in/showbidDocument/9857868) | ICU Beds,Air mattress,Adjustable Bed Side Table,Bed Side Locker with Membrane Pressed Top,Crash Car — ICU BEDS WITH MATTRESSES | HOSPITAL_BEDS | 2026-10-06T14:00:00+05:30 | partial |
| [GEM/2026/B/7811070](https://bidplus.gem.gov.in/showbidDocument/9634343) | Digital Radio-Fluoroscopy X-ray Machine of 1000 mA with Flat Panel Detector | DIGITAL_RADIOGRAPHY | 2026-10-03T09:00:00+05:30 | partial |
| [GEM/2026/B/8035461](https://bidplus.gem.gov.in/showbidDocument/9891705) | Defibrillators,ECG leads with connector card sensor with lead,SpO2 Sensor adult,SpO2 Sensor Paediat — Defibrillator | DEFIBRILLATORS | 2026-10-07T11:00:00+05:30 | partial |
| [GEM/2026/B/7885248](https://bidplus.gem.gov.in/showbidDocument/9718972) | Mechanical Ventilator,Heated servo controlled humidifier,Disposable in built dual heater wire and h — Mechanical Ventilators | VENTILATORS | 2026-10-20T16:00:00+05:30 | partial |
| [GEM/2026/B/8020544](https://bidplus.gem.gov.in/showbidDocument/9874405) | OT LIGHT,LED MODULE,CMC for first year,CMC for second year,CMC for third year,CMC for fourth year,C — O T Light | OT_LIGHTS | 2026-10-05T10:00:00+05:30 | partial |
| [GEM/2026/B/8054669](https://bidplus.gem.gov.in/showbidDocument/9913595) | Multichannel Transcranial Doppler (TCD) Machine Robotic Probes | ULTRASOUND | 2026-10-17T12:00:00+05:30 | partial |
| [GEM/2026/B/7950469](https://bidplus.gem.gov.in/showbidDocument/9793626) | High End Echo Machine,1 to 6 MHZ Plus Minus 1 MHz single crystal convex array transducer for genera — High End Echo Machine | ULTRASOUND | 2026-10-20T17:00:00+05:30 | partial |
| [GEM/2026/B/7963587](https://bidplus.gem.gov.in/showbidDocument/9808925) | Mobile Digital Radiography System (V2) | DIGITAL_RADIOGRAPHY | 2026-10-03T16:00:00+05:30 | partial |
| [GEM/2026/B/8091912](https://bidplus.gem.gov.in/showbidDocument/9956459) | Ultrasound Machine (V2) | ULTRASOUND | 2026-10-13T15:00:00+05:30 | partial |
| [GEM/2026/B/8037864](https://bidplus.gem.gov.in/showbidDocument/9894537) | Syringe Infusion Pump | INFUSION_PUMPS | 2026-10-14T14:00:00+05:30 | complete |

Two incidental matches were corrected during this review: GEM/2026/B/7875662 is an operating table with C-arm/X-ray compatibility, not a C-arm procurement; GEM/2026/B/8034327 is an electrocautery device whose technical section mentions laparoscopic cases, not supplied endoscopy equipment. Both remain in the wider medical tracker. Actual C-arm bundles and laparoscopic instruments remain positive.

## Limits and implementation checks

- Thirteen equipment groups receive alias classification, priority badges, and independent dynamic filters in Opportunities and Unknown deadlines.
- Priority document selection fairly shares the original 16-record budget across groups and generic BOQs; three workers, 55 seconds and eight linked documents per record remain the caps. Deferred records can retry without overwriting earlier extraction. Cursors are process-local and restart on a cold instance.
- Official labelled extensions can make an expired original eligible for inspection; cancellation/withdrawal amendments prevent active inspection. GeM index extensions continue to take precedence over original PDFs.
- A failed GeM state organisation lookup no longer prevents its official health-ministry fallback. Regional/organisation/state limits and institution/bid identity checks remain unchanged.
- New extraction fields cover imaging, infusion accuracy/occlusion, warming, surgical illumination, anaesthesia delivery and airway visualization. Every value is an excerpt with official page/row provenance.
- 649 tests across 26 files passed. Type checking, lint and the production build also passed.
- No current monitor or anaesthesia-machine opportunity was found in this snapshot. A fluid-warmer record has an unknown deadline. Zero results do not establish that no unmirrored/protected tender exists.
- Some GeM organisation searches fail; SLBSGMCH institutional notices were unavailable. Portal protection, generic unseen BOQs and changing pagination can leave gaps. No CAPTCHA bypass or invented tender/date was used.
- Retender notes require explicit retender wording plus matching cancelled history. They do not infer a replacement or silently suppress an older tender without official terminal evidence.

Detailed per-category candidate source IDs, document availability and raw observations are available through `/api/diagnostics` and the development `audit:data` export. Runtime data does not depend on this report.
