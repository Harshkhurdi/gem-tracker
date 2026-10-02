# Application review — 2 October 2026

Astra coordinated two GPT-6.1 Sol reviewers at medium reasoning. The review covered source retrieval and HTTP handling, document parsing and specification amendments, deadline/status transitions, dashboard filters, caching/API integration and presentation. The release agent reviewed the combined changes and checked the deployed workflows separately.

## Confirmed issues fixed

- **Date-only deadlines:** Detail-page evidence no longer promotes a deadline without a confirmed time to `ACTIVE_VERIFIED`. Document links and opportunity rows show “Time not confirmed” instead of displaying an inferred end-of-day time. Browser status transitions apply the same rule.
- **Specification amendments:** Changing battery charge time no longer discards battery runtime just because both belong to one display field. Only matching clause subjects can supersede earlier requirements. Same-date, undated, wrapped and contradictory changes remain visible and explicitly require review when precedence is ambiguous.
- **Spreadsheet safety:** XLSX validation follows the real ZIP directory, verifies local headers, rejects duplicate/traversal names and unsupported entries, and bounds actual DEFLATE expansion before passing the workbook to the spreadsheet reader. Forged size metadata cannot bypass the expansion limit.
- **Official source redirects:** Credential-bearing URLs and nonstandard ports are rejected, including the approved Wix PDF redirect. Cross-origin redirects strip sensitive headers and cannot replay a form body. Same-origin form redirects retain correct HTTP semantics. NIC navigation stays within its official portal origin.
- **Invalid fetch timestamps:** A malformed timestamp now downgrades verification rather than throwing during normalization.
- **PDF and display handling:** Legacy PDF text retrieval uses the existing 120-page inspection limit. Buyer/location text suppresses extraction clutter and missing-value placeholders. Long repeated PDF descriptions are shortened for presentation; original evidence and official links remain available.

## Validation before release

- 685 tests passed across 30 files, including 31 added regression cases.
- TypeScript check and ESLint passed.
- Production dependency audit reported zero known vulnerabilities.
- Whitespace validation passed.
- Production build passed, including PDF worker, native assets and spreadsheet parser deployment traces.
- Deployment and live browser checks are recorded separately in the release verification.

## Operational limits

This is a code review with regression and browser checks, not a guarantee that every upstream portal or future document format will work. CAPTCHA-protected documents, unsupported legacy XLS files and unreviewed scans still require manual official-portal checks. Source inspections have time/page limits and report partial coverage honestly. Refresh remains request-driven with a 15-minute source cache; there is no scheduled background crawler. Optional durable cache configuration determines recovery across cold instances. No broader crawl, invented equipment evidence or CAPTCHA bypass was added.
