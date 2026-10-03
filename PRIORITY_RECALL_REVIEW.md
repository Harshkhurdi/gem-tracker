# Priority discovery improvement — 3 October 2026

The existing GeM/CPPP searches were reviewed before changing their budgets. The available snapshots showed no deferred candidates, and inspected query alternatives provided no demonstrated recall gain. Their existing relevance rules and request limits were retained.

A missing official discovery channel was identified: PGIMER's institutional notice board. A new source supplements the existing CPPP and GeM readers. It reads the public listing, verifies the specific notice title, follows official document links, and expands safely readable priority equipment rows.

## Four newly established priority items

Official notice: [PGIMER institutional notice 15239](https://pgimer.edu.in/PGIMER_PORTAL/PGIMERPORTAL/Tender/JSP/tenderViewNew.jsp?record=8&tenderId=15239&cname=Purchase/Procurement), issued 1 October 2026, E-Tender Notice PI(EP)/26-27/01.

| Official item | Equipment | Quantity | Submission date |
| --- | --- | --- | --- |
| 3 | Transport Ventilators | 4 | 21 October 2026 |
| 6 | Lower Tract Endoscopy Set | 1 | 22 October 2026 |
| 9 | Lower Tract Endoscopy Set for Emg. OT | 1 | 26 October 2026 |
| 10 | Lower Tract Endoscopy Set for TURP, TURBT, OIU, Cystoscopy | 1 set | 26 October 2026 |

These four items were absent from the previous production snapshot. Their distinct item references combine the published batch reference with the official item ordinal; no CPPP or GeM bid ID is invented. The table publishes submission dates and an opening time of noon. Noon is not assigned as a submission time: records remain day-precision, ACTIVE_LIKELY, with time unconfirmed.

## Quality controls and limitations

- The scanned PDF was visually checked. Reviewed excerpts apply only after the exact official URL and newly retrieved SHA-256 match. Changed or unreviewed scans remain incomplete. PDF SHA-256: `5775c2a483f752b3bfb4f1c7ea7f7a370cd7da1c61b8b6e6f28c7429c2d9f2b5`.
- Listing/detail/PDF batch identity must agree. An unreadable numbered row breaks ditto-date inheritance. Equipment and quantity extraction uses only each item's own row; full technical specifications remain partial.
- Generic batch dates, extensions, bid IDs and item-specific cancellation labels are not inherited by all expanded items. Where batch amendments are linked, item deadlines remain unknown pending applicability review; document links stay available.
- All ten amendments of older notice 15227 were reviewed. Only its two radiofrequency vessel-sealing items have October extensions, and those are already tracked through CPPP. Its expired ultrasound rows were not promoted.
- PGIMER serves an incomplete TLS chain. Its missing public intermediates are supplied only for the two exact official HTTPS hosts. The chain must validate to Node's existing ISRG Root X1; hostname validation, certificate verification and rejection of partial trust chains remain enabled. Other sources keep their connection behavior.
- The new source has a twelve-notice detail limit and reports incomplete scans or checks as PARTIAL. This improves demonstrated coverage; it does not establish complete coverage of all tenders. The existing request-driven refresh and cache behavior remains unchanged.

## Validation

- Independent Astra/Sol 6.1 medium source investigations and Sol 6.1 medium final adapter review; two reproduced parser edge cases were fixed and covered by regression tests.
- 717 tests passed across 32 files, including identity, dates, per-row evidence, cancellation/amendment safety and strict TLS behavior.
- Typecheck, lint, production build and deployment trace verification passed.
- Final live source read: 104 institutional notices; four current medical/generic details checked; four priority items established; no failed detail reads. The source honestly reports PARTIAL for the older unreadable generic scan.

Production deployment and browser/API verification are recorded in the task's release evidence after publication.
