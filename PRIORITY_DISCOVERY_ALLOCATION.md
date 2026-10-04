# Priority equipment discovery allocation

Scope: government healthcare across Chandigarh, Punjab, Himachal Pradesh, Jammu and Kashmir, Uttarakhand and Haryana. All 13 existing priority groups remain supported, including unknown-deadline review.

## Allocation changes

- GeM retains a four-request maximum. When both lanes have work, three slots serve priority searches or document checks and one serves ordinary work; either lane borrows idle capacity.
- The priority keyword sweep grows from 27 to 50 specific search terms. All equipment categories get a primary query before aliases, with rotating category starts and category-balanced deeper pagination. Official public payloads are unchanged.
- Priority listing allowance: 75 seconds and 240 requests, up from 45 seconds and 140. Buyer-document allowance: 90 seconds and 280 attempts, up from 60 seconds and 160. These are ceilings, not completeness claims.
- Buyer verification rotates across regions and equipment categories. Unlocated national candidates get a separate queue; scheduling hints never establish ownership or destination. Candidate rotation uses a coprime stride to avoid a permanently repeated verification prefix.
- State-government buyer pages (up to 20) and returned healthcare-organisation queries precede deep general GeM pagination. Selected organisations get first-page breadth before deeper pages; large returned directories use a rotating bounded batch.
- Regional and keyword adapters share successful buyer document extraction for up to 120 seconds, with in-flight deduplication, 128 entries and a 16 MiB text ceiling. Failed reads are never cached; matching ID, ownership and location are checked for every caller.
- NIC organisation traversal reads each matching chain before deeper pages and uses an actual cancellation signal to preserve 40% of the source deadline for detail work. Current priority metadata and amendments precede priority documents and routine metadata. A second same-session document pass catches priority equipment revealed by routine titles. National healthcare document inspection still requires a monitored destination.

## Quality and validation

Government ownership, physical destination, identity, medical product scope, deadlines, amendment checks and deduplication rules remain in force. General listing coverage may be partial, and that remains visible. Partial GeM omissions retain earlier observations for at most 24 hours, with unchanged dates and stale labels.

812 tests passed across 38 files, together with type checking, lint and the production build/asset trace checks. Tests exercise queue fairness, region/category starvation, bounded rotating windows, cache expiry/eviction/failure retries, phase cancellation/session preservation and priority inspection of generic detail titles. Live source comparison and timed cold production checks are recorded in task artifacts.

Final browser review identified an X-ray baggage-scanner maintenance tender for a court among general medical results. Explicit security-scanner phrases no longer supply clinical X-ray/CT or portfolio evidence; separately procured medical devices remain eligible. Reprocessing the captured production dataset excluded only `2026_CHD_95366_1` and retained every other existing medical record.

A quality guard excludes optical laser Doppler from ultrasound priority without excluding a separate ultrasound item in the same BOQ. Technology evidence: [Perimed laser Doppler perfusion monitoring](https://www.perimed-instruments.com/us/products/periflux-vascular-systems/periflux-6000/laser-doppler-perfusion-monitoring-ldpm/).
