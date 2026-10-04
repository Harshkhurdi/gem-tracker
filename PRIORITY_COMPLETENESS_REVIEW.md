# Priority discovery and zero-count institution review — 4 October 2026

## Confirmed gaps and repairs

Official J&K Health and Medical Education detail pages confirmed four priority patient-monitor notices absent from the preceding production snapshot:

- 2026_HME_316352_1, CENTRAL MONITOR, 10 October 2026 11:00 IST.
- 2026_HME_316215_1, HIGH END MULTIPARA MONITOR, same deadline.
- 2026_HME_308707_9, Vital Sign Monitor, 12 October 2026 16:00 IST.
- 2026_HME_308707_5, Multipara Monitor with invasive blood monitoring system with transducers, same deadline.

Clinical aliases now include multipara and vital-sign monitors. A generic central monitor requires the official medical product category or explicit patient parameters; IT/CCTV monitoring remains excluded. ABG analyser spelling is also recognized as laboratory equipment, without promoting it into an unrelated priority group.

NIC adapters now finish identity, deadline and amendment checks before PDF/full-document processing. The routine 20/40/64 cap expands for current priority/opaque candidates, bounded at128 and by the existing HTTP source deadline. Source notes report how many priority metadata checks completed. Records do not become verified when amendment checking fails.

## Independent GeM priority recovery

A new source uses GeM's publicly exposed full-text form and reads equipment terms across all13 priority groups. Searches are nationwide: adding state words did not reliably narrow their results. No guessed combined state/keyword payload is used. Each national hit requires a matching bid PDF and government-healthcare/location evidence, or the existing explicit regional government health-department fallback for inaccessible PDFs. Generic acronyms alone cannot establish a region.

Every term's first page is attempted before deep pagination. Listing work is bounded to45seconds/140requests; buyer verification to60seconds/160attempts. Candidates from explicit regional health departments are checked first, with per-equipment queues and time-based rotation for the remaining national candidates. GeM requests share the existing global request pool. Partial keyword snapshots retain previously observed records for up to24hours with their original dates and stale labels. Keyword term/page coverage is visible in source notes and diagnostics.

An isolated live keyword sweep read1,012 unique public bids, attempted160buyer documents, and retained five regional government-healthcare bids. Those five were already found by other routes: independent recovery adds resilience without inflating counts through duplicates. Further live aggregation/deployment checks are recorded in the task artifacts.

## Why institutions can show zero

The397-entry directory is a government healthcare inventory, not a promise that397 facilities have currently open bids. Counts require a direct institution/consignee match. State and central buying-body tenders without named delivery facilities remain statewide; they are not fabricated as a tender for each hospital. Historical/closed records and incomplete source access also affect what is found.

The UI now labels the directory separately, describes direct matches, explains incomplete coverage on zero-count cards, and provides regional buying-body results without claiming those records belong to an individual facility. Regional counts use all tender records, independent of previously selected opportunity filters.

Protected documents, changing portal results and source budgets still prevent an honest guarantee that no published priority tender is ever missed. New coverage does not weaken government ownership, medical-product classification, identity, dates or deduplication checks.

## Validation

All 778 tests across 35 files, type checking, lint and the production build passed. The live 35-source audit returned all four repaired J&K monitor tenders as ACTIVE_VERIFIED in PATIENT_MONITORS, with the official 10/12 October deadlines. Its snapshot had 66 verified and 99 likely active opportunities. Of 397 directory entries, 370 had no direct matched record; regional buying-body records remain separate. These are retrieval results, not evidence that those facilities have no procurement activity.
