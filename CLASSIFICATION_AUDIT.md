# Classification accuracy audit - 1 October 2026

## Root cause and fix

The NIC detail parser discarded authoritative Tender Category and Product Category. The ANAESTHESIA rule accepted a department name as item evidence; normalization then assigned Medcaptain and Skanray. Official tender 2026_CHD_95906_1 is Works / Civil Works in the Chandigarh construction chain.

The generic fix preserves four official procurement categories through parsing, normalization and deduplication. Classification and portfolio matching use those categories and actual item scope, remove department/location/buyer context, and require an anaesthesia device object. Device repair, servicing, CMC, CAMC and installation remain eligible. Actual devices can override overly broad portal categories; civil titles cannot use later clinical boilerplate to do so. Expanded details expose available official categories. Versioned cache keys prevent reuse of older classification snapshots. No tender-ID blacklist is used.

## Dataset comparison

Fresh official retrievals before and after the fix; counts are snapshots, not guaranteed complete portal inventories. Both were taken on 1 October 2026.

| Metric | Before | After |
|---|---:|---:|
| Total normalized records | 291 | 289 |
| Active verified | 16 | 15 |
| Active likely | 10 | 10 |
| Active total | 26 | 25 |
| Deadline unknown | 148 | 142 |
| Expired | 117 | 122 |

Five civil/infrastructure false positives removed (one active, four unknown); three genuinely medical ultrasound records restored because an integrated LCD monitor is ancillary to the ultrasound machine. Twenty-nine incorrect brand assignments removed: Medcaptain 15, Skanray 13, KARL STORZ 1. Two were active assignments on the confirmed civil tender; the remainder were department/context-derived historical assignments. Clinical trainers and CPR machines remain medical records without anaesthesia-derived brand matches.

### Removed infrastructure records

- [Variuos Need Based Repair Works required in the Department off Anesthesia, Block-D, GMCH, Sector 32, Chandigarh.](https://etenders.chd.nic.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SVb75tAwFnZasR%2BiJCAFrMQ%3D%3D) - ACTIVE_VERIFIED; 2026_CHD_95906_1.
- [Quotation for 1.5 Tesla MRI Machine Room regarding installation of new 8.5 ton ductable AC Unit](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5420.pdf) - DEADLINE_UNKNOWN; d950ba89a53f945219c6.
- [Quotations for 1.5 Tesla MRI Machine Room regarding installation of new 8.5 ton ductable AC Unit.](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5419.pdf) - DEADLINE_UNKNOWN; cb517b376ca20b7b2a3d.
- [Repair of the central AC installed in the MRI Machine Room](/api/documents/bfuhs/5148) - DEADLINE_UNKNOWN; e4d7315de04fcadbe8f7.
- [Quotations for New Installlation of additional Oxygen, Vacuum and surgical air outler points in new Endoscopy room at ACI Bathinda](/api/documents/bfuhs/4815) - DEADLINE_UNKNOWN; abf99a43419d0bfd6032.

### Focused deadline review

The existing hash-verified scanned-PDF metadata is now reached by the bounded document-inspection queue after infrastructure candidates are excluded. No deadlines were guessed or newly inferred from unrelated publication/bid-opening dates. Both complete one-page official scans were visually checked again:

- [Sutures, Tender_5215.pdf](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5215.pdf): last receipt date 2 September 2026, 5:00 PM IST; now EXPIRED.
- [Suction machine, Tender_5211.pdf](https://examination.bfuhsonline.ac.in/OnlineTender/tender/2026/Tender_5211.pdf): last receipt date 17 August 2026, 5:00 PM IST; now EXPIRED.

Changed PDF bytes fail the SHA-256 guard and do not reuse reviewed deadlines. Of 142 unresolved records, 138 are BFUHS, three Bilaspur GeM mirror and one Bilaspur NIQ. Missing listing dates, scan-only evidence, bounded document inspection, and incomplete mirror history remain the reasons; later amendments must still be checked.

## All 26 baseline active tenders audited

Every baseline active tender was checked against its official detail page or retrieved official PDF. No additional active infrastructure false positive was found. Portfolio matches below describe product relevance, not manufacturer eligibility or an explicit brand requirement.

| Brand | Surviving active matches |
|---|---:|
| Samsung Healthcare | 2 |
| Hamilton Medical | 0 |
| KARL STORZ | 5 |
| LINET | 0 |
| Medcaptain | 0 |
| Spacelabs Healthcare | 0 |
| Skanray | 6 |

Zero active matches are valid outcomes. Historical patient-monitoring, ventilation, anaesthesia, infusion and hospital-bed records remain eligible and testable with All statuses. Imaging and endoscopy have active opportunities.

| Official tender | Decision / medical category | Portfolio evidence | Source review |
|---|---|---|---|
| [CRRT Machine](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D) | OTHER_MEDICAL_EQUIPMENT | None | official PDF retrieved and extracted |
| [E- tender fro the procurement of various equipement for Department of Orthopaedic surgery(Trauma Centre), IGMC Shimla.](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S4mW1kgU8i%2Fuy2Aleg%2BTULg%3D%3D) | OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [E-TENDER FOR THE PROCUREMENT OF ELECTROSURGICAL UNIT WITH VESSEL SEALING AND BIPOLAR FOR NEUROSURGERY DEPARTMENT (TRAUMA CENTRE), IGMC SHIMLA](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S3uUGPxzPmWMd6hhORW7WTA%3D%3D) | ELECTROSURGERY | KARL STORZ: ELECTROSURGICAL, VESSEL SEALING; Skanray: ELECTROSURGICAL, VESSEL SEALING | official tender details and categories checked |
| [EEG Machine (Q2)](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D) | OTHER_MEDICAL_EQUIPMENT | None | official PDF retrieved and extracted |
| [Electrocautery Machine (V2) (Q2)](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D) | ELECTROSURGERY | KARL STORZ: Electrocautery; Skanray: Electrocautery | official PDF retrieved and extracted |
| [Flat Panel C-arm Machine](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D) | C_ARM | Skanray: C-arm | official PDF retrieved and extracted |
| [GeM Bid for Procurement of Ammonia Kits and Controls – Department of Biochemistry](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9901742_0.pdf) | LAB_IVD | None | official PDF retrieved and extracted |
| [Laparocator with camera (GeM Bid No. GEM/2026/B/8047970)](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/123.pdf) | LAPAROSCOPY | KARL STORZ: Laparocator | official PDF retrieved and extracted |
| [MacroMedics® BreastBoard™ SX along with associated accessories on a PAC basis. Bid No - GEM/2026/B/8010657](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/GeM-Bidding-9863281%20%284%29.pdf) | OTHER_MEDICAL_EQUIPMENT | None | official PDF retrieved and extracted |
| [Mahinery and equipment for Deptt of Pathology under DIAMONDS project](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S191rxvMd9JgYsac1gi7SSg%3D%3D) | OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Optical Colposcope for Department of Obs Gynae Department - (GEM/2026/B/7946719)](https://www.aiimsbilaspur.edu.in/sites/default/files/2026-09/Coloscope%20bid.pdf) | OTHER_MEDICAL_EQUIPMENT | None | official PDF retrieved and extracted |
| [PACEMAKERS](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=S1BNcKer1xwKV2j3geFbJHg%3D%3D) | OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Procurement of Digital Mammography Machine for Pt. JLNGMC Chamba](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SEsgTfEv%2FkTGsluWkWYE4yA%3D%3D) | DIAGNOSTIC_IMAGING, OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Procurement of Digital PET/CT Scanner 128 Slice](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SgUO2xksgfP6Bd5Ls5MXc2g%3D%3D) | DIAGNOSTIC_IMAGING, OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Procurement of Electricl Suction Machine](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMfb%2BInwhr5ryKdzxP76NmA%3D%3D) | OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Procurement of Spy Glass Digital Controller](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=ScZBfTIbS2YN7dbi0cmX9wQ%3D%3D) | ENDOSCOPY | None | official tender details and categories checked |
| [Purchase of brachytherapy machine](https://eproc.punjab.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SMzsYWGqKpAcOQofNybWjeg%3D%3D) | OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Quotation for repair of Microscope](https://examination.bfuhsonline.ac.in/onlinetender/tenderview.aspx) | LAB_IVD | None | official PDF retrieved and extracted |
| [Radiant Warmer](https://www.aiimsbathinda.edu.in/Procurements.aspx?FXoLDJ=BOII5FUynjpl5RZJJ8nW1g%3D%3D&JnH7tY=BTQgLv+ebY48FN9pEezgn4swg+G4uRJpYiYSMufUrUU%3D) | OTHER_MEDICAL_EQUIPMENT | None | official PDF retrieved and extracted |
| [Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=Swvxo475VlHq6gLnyMDqknw%3D%3D) | LAPAROSCOPY, ELECTROSURGERY, OTHER_MEDICAL_EQUIPMENT | KARL STORZ: Laparoscopic, Vessel Sealing; Skanray: Vessel Sealing | official tender details and categories checked |
| [Radiofrequency cutting Coagulation and Vessel Sealing System, Standalone or Integrated with Bipolar Device with Hand Instruments for Open/ Laparoscopic Surgery](https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SUE%2BfIRQ0gb75WQ%2Bu9%2BNWsQ%3D%3D) | LAPAROSCOPY, ELECTROSURGERY, OTHER_MEDICAL_EQUIPMENT | KARL STORZ: Laparoscopic, Vessel Sealing; Skanray: Vessel Sealing | official tender details and categories checked |
| [Rate Contract of 256 SLICE CT SCANER](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SR572qxjL2ET1sFYNSH1iLg%3D%3D) | CT, OTHER_MEDICAL_EQUIPMENT | None | official tender details and categories checked |
| [Rate Contract of Colour Doppler Ultrasound Machines (Fully Loaded)](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SDUW009K7td7YKZZ%2F7%2BxpKg%3D%3D) | ULTRASOUND, OTHER_MEDICAL_EQUIPMENT | Samsung Healthcare: Doppler, Ultrasound | official tender details and categories checked |
| [Rate Contract of Digital Radiography Machine](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SxK7Xwk5wwtwjzeMy6IJ5Ig%3D%3D) | XRAY_DR, OTHER_MEDICAL_EQUIPMENT | Samsung Healthcare: Digital Radiography; Skanray: Digital Radiography | official tender details and categories checked |
| [UV-VIS Spectrophotometer and Fluorescent Microscope for establishment of VRDL Lab](https://hptenders.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SCDutbJLMaZ9TS2ZZR23wpA%3D%3D) | LAB_IVD | None | official tender details and categories checked |
| [Variuos Need Based Repair Works required in the Department off Anesthesia, Block-D, GMCH, Sector 32, Chandigarh.](https://etenders.chd.nic.in/nicgep/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&sp=SVb75tAwFnZasR%2BiJCAFrMQ%3D%3D) | REJECTED: Works / Civil Works | None | official tender details and categories checked |

## Validation

368 automated tests passed across 16 test files, including all 279 existing tests and 89 new regressions. Lint, TypeScript checking and the production build passed. Regressions cover the exact tender through the real dashboard pipeline, department/buyer-only context, civil infrastructure categories, genuine device repair/CMC/CAMC/installation, integrated device monitors, and preservation of official metadata. The existing build check confirms PDF worker/native assets are included in Vercel API traces.

## Source coverage

The refreshed local audit has 10 SUCCESS, 7 PARTIAL and 2 UNAVAILABLE sources. ESIC public office notices improved from unavailable to partial; ESIC CPPP remains independently successful. SLBSGMCH institutional notices and direct GeM remain unavailable. Institution GeM mirrors remain partial and operational. No CAPTCHA or portal protection was bypassed.

## Refresh security

The existing authenticated refresh route is unchanged. A strong random ADMIN_REFRESH_TOKEN was configured as a sensitive production variable in the existing Vercel project. Its value is excluded from code, audit reports and client bundles. Production deployment and authenticated/unauthenticated checks are recorded separately after the push.
