# PHSC priority tender coverage

The PHSC Medical Wing is covered through the existing Punjab Health & Family Welfare eProcurement adapter, Punjab GeM delivery and state-buyer searches, a targeted returned PHSC organisation query, and the national priority equipment sweep. The existing 13 priority equipment groups remain in scope.

## Improvements

- The exact full PHSC name returned by GeM is pinned ahead of rotating general health authorities for Punjab. Names are not synthesized. The existing six-organisation, 24-request and eight-page caps remain.
- The public GeM `search-bids` endpoint currently returns HTTP 404 with the exact JSON `{"status":0,"code":404,"message":"No data found"}` for no matches. Only an explicitly opted-in POST to that exact official origin/path accepts that tiny response. HTML challenges, changed structures, unrelated 404s, GET redirects and other errors still fail. Empty later pages remain partial if earlier pages reported more results.
- PHSC Medical Wing reference-only titles, `Various Items`, generic equipment/instrument packages and CMC/AMC/CAMC notices enter existing bounded metadata/document inspection. Full official buyer identity and Punjab/source scope are required. Drugs, consumables, implants, manpower and engineering works do not enter this opaque equipment path.
- Buyer names and the `Medical Equipments/Waste` category supply no priority product evidence. Positive identity-matched document items or an explicit equipment title/detail must establish the purchased device. Protected/unreadable documents remain unresolved.
- Source notes report PHSC opaque-title inspection. Cache generation v13 makes the change take effect on source refreshes.

## Verification on 4 October 2026

A live public query returned the exact full PHSC organisation and its exact no-match result. Updated Punjab GeM discovery reports `Organisation search PUNJAB HEALTH SYSTEMS CORPORATION: 0 unique bids read of 0.` without claiming complete general Punjab coverage. Punjab eProcurement read 23 current DHFW listings; no clearly named target-priority PHSC device was present in that checked list. Existing suction equipment and non-priority notices are not counted as newly found priority opportunities.

Tests cover crowded buyer rotations, absent/unproven buyer names, exact versus malformed empty results, split response chunks, redirect isolation, later-page omissions, opaque-title metadata inspection, actual BOQ product promotion and protected-document non-promotion. Existing quality and runtime checks remain required before publishing.

## Remaining limits

The [Punjab government department directory](https://punjab.gov.in/government/departments/department-of-health-family-welfare/) lists `https://punjabhealth.co.in` as PHSC's website. It was inaccessible during this review, so no unverified mirror adapter was added. NIC-protected attachments and legacy XLS BOQs can still require manual review; official tender links remain available. Portal outages, incomplete pages and bounded public searches still prevent a guarantee that every tender is captured.
