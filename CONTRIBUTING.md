# Contributing to Government Medical Tender Tracker

Thank you for your interest in improving **Government Medical Tender Tracker (GeM Tracker)**! Contributions that make Indian public medical-equipment procurement data more reliable, transparent, accessible, and useful are welcome.

GeM Tracker is an independent, MIT-licensed Next.js/TypeScript project. It currently focuses on **Chandigarh, Punjab, Himachal Pradesh, Jammu and Kashmir, Uttarakhand, and Haryana**. The source registry, institution directory, and extraction rules are deliberately evidence-driven; please do not describe the project's coverage as exhaustive.

- **Repository:** https://github.com/Harshkhurdi/gem-tracker
- **Report bugs or suggest features:** https://github.com/Harshkhurdi/gem-tracker/issues
- **Open a pull request:** https://github.com/Harshkhurdi/gem-tracker/pulls
- **Project background and known limitations:** [README.md](README.md), [AUDIT.md](AUDIT.md), and [VALIDATION.md](VALIDATION.md)

## Ways to contribute

You can help by:

- Fixing bugs in official tender-source adapters, pagination, date handling, document extraction, and error reporting.
- Improving medical-equipment classification, institution matching, deduplication, and source provenance.
- Adding **verified** government healthcare institutions or public procurement sources in the supported regions.
- Improving accessibility, responsive design, performance, documentation, or tests.
- Investigating source changes, broken government links, incorrect deadlines, or misleading classifications.
- Proposing broader geographic coverage, with a scoped implementation and evidence of source reliability.

Small, focused pull requests are easier to review than unrelated changes bundled together.

## Before starting

1. Search [existing issues](https://github.com/Harshkhurdi/gem-tracker/issues) and [pull requests](https://github.com/Harshkhurdi/gem-tracker/pulls) for similar work.
2. For a substantial feature, new source integration, or architecture change, open an issue describing the problem and approach before building it.
3. For straightforward documentation, test, or bug fixes, you can submit a pull request directly.
4. Read the applicable documentation in `README.md`, especially its data-accuracy, source-coverage, security, and MedOps integration notes.

## Local development

**Requirements:** Node.js **22.13+** (Node 24 recommended), npm, and Git.

```bash
git clone https://github.com/Harshkhurdi/gem-tracker.git
cd gem-tracker
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

**Environment variables are optional for basic development.** Configure only the integrations you are actively testing. Never commit `.env.local`, API tokens, cookies, private records, or production credentials. Server-only credentials must never use the `NEXT_PUBLIC_` prefix.

The first live request may take time because upstream government portals can be slow or unavailable. Source availability depends on your network and the portal; a local build passing does **not** prove a live portal works.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Check ESLint rules |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run Vitest tests |
| `npm run build` | Build and verify the packaged server/PDF assets |
| `npm start` | Start a production build locally |
| `npm run fetch:live` | Inspect real source-adapter results and failures |
| `npm run audit:data -- --output /tmp/tender-audit` | Export a local, reproducible data audit |

`fetch:live` depends on external websites. Describe failures and network conditions rather than changing tests to hide real upstream problems. Keep audit outputs and potentially sensitive local files out of commits.

### Where to look in the code

- `src/lib/sources/registry.ts` and `src/lib/sources/adapters/`: official source definitions and readers.
- `src/lib/config/`: institution data, equipment taxonomy, and portfolio configuration.
- `src/lib/tender/`: tender normalization, matching, dates/status, and deduplication.
- `src/lib/specification/`: structured specification extraction and review.
- `src/lib/cache/`: cache and optional Redis integration.
- `src/app/api/`: Next.js server API routes.
- `src/components/dashboard/`: dashboard interface.
- `tests/`: automated tests; `scripts/`: development, validation, and audit utilities.

Follow [`AGENTS.md`](AGENTS.md) when working on Next.js behavior and check the installed Next.js documentation when necessary; assumptions from older versions may not apply.

## Data integrity and procurement-source rules

Accuracy and traceability matter more than maximizing tender counts.

1. **Use legitimate public or explicitly authorized access.** Respect applicable portal terms, access restrictions, rate limits, and copyright/redistribution rights. Do not bypass CAPTCHAs, login requirements, bot protections, TLS/certificate checks, or other access controls. Do not introduce aggressive unbounded crawling.
2. **Preserve provenance.** Retain official source URLs, tender identifiers, contributing-source links, document references, and amendment/corrigendum evidence. Do not fabricate tenders, quantities, prices, institutions, delivery locations, specifications, or deadlines.
3. **Be honest about coverage.** Report inaccessible sources, incomplete pagination, missing documents, extraction limits, and unknown fields as partial or unknown. A portal failure or empty query is not proof that no tenders exist.
4. **Verify medical relevance.** Exclude unrelated civil works, office equipment, furniture, and other false positives. Do not assume a brand, model, supplier qualification, or compliance merely because a clinical product appears in a portfolio category.
5. **Respect identity and dates.** Avoid merging unrelated tenders with reused identifiers. Treat amendments and cancellations carefully; preserve date-only deadlines and Indian Standard Time semantics already used by the project.
6. **Keep extraction explainable.** Ground any structured specification field in the original document, with page or worksheet/row evidence where applicable. Do not interpret missing content as a confirmed value.
7. **Never use synthetic fixtures as live procurement data.** Clearly separate mocked/test records from production-source observations.

For a new source adapter, provide at least one real official source URL, its institutional/geographic scope, expected data fields, pagination and failure behavior, bounded request strategy, and tests for malformed or changed responses. Do not claim complete state or national coverage without evidence.

## Tests and quality checks

Before submitting a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For changes to source adapters, classification, parsing, caching, status, or integrations, add or update focused tests. Prefer reproducible test fixtures and explicit missing/error cases. Test both correct matches and realistic false positives.

If you run a live-source audit, include a short account of which portals were reachable and which were partial/unavailable. **Do not** put credentials, internal cookies, or non-public data in issues, PRs, test fixtures, logs, or screenshots.

## Pull request process

1. Fork the repository and create a descriptive branch (for example, `fix/pgimer-deadlines` or `docs/contributing-guide`).
2. Make a focused change, with tests and documentation where appropriate.
3. Run the checks above and review your diff for secrets, generated artifacts, and unrelated changes.
4. Open a pull request against `main` with:
   - **Problem:** what was broken or missing.
   - **Approach:** how your change solves it.
   - **Evidence:** official source links or reproducible examples, when relevant.
   - **Validation:** commands run, results, and any known limitations.
   - **Screenshots:** for visible UI changes, when useful.
5. Respond to review feedback and keep the discussion respectful and technical.

Maintainers may request changes, defer scope expansions, or decline changes that compromise accuracy, security, maintainability, licensing, or source-access rules. Opening a pull request does not guarantee it will be merged.

## Security and sensitive integrations

If you find a suspected vulnerability, **do not publish exploit details, working secrets, or personal information in a public issue**. Use GitHub's private vulnerability reporting feature if available, or contact the maintainer privately through an available GitHub profile contact method.

Changes involving MedOps must preserve explicit user authorization, environment isolation, server-side secret handling, review-before-send behavior, and safe retry/idempotency. Never transmit confidential business data to third-party AI services or include it in test fixtures. Do not weaken authorization, cookie integrity, or auditability to simplify an integration.

## Community expectations

Be constructive and respectful. Describe problems clearly, assume good faith, and welcome contributors with different experience levels. Harassment, discrimination, personal attacks, spam, and attempts to obtain private credentials are not welcome.

## Licensing

By submitting a contribution, you agree that your contribution may be distributed under the repository's [MIT License](LICENSE). Please contribute only code, documentation, data, and other material you have the right to share under that license.

Thank you for helping make public medical procurement information more trustworthy and accessible.
