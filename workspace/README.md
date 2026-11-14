# Opportunity Ledger workspace

Private Cloudflare Workers / D1 / R2 review application. Sites owns authentication and storage provisioning. The original read-only service remains independent.

## Run and publish

- `node --test test/*.test.mjs` — database, normalization, policy, authorization and reconciliation probes using SQLite.
- `node scripts/build.mjs` — embed the interface into a standalone Worker ES module.
- Publish the exact pushed source through Sites with `.openai/hosting.json`, the Worker output, and `drizzle/` migrations.

Do not deploy this Worker independently without adding an authenticated gateway: identity-less refresh, health and schedule-state routes intentionally rely on the owner-private Sites dispatch gate. Never make this Site public.

## Data paths

1. Direct bounded Ashby feeds: Semgrep, AfterQuery, Theori and Socure, from the original repository registry. Complete successful feeds retain raw bytes in R2 and normalized records in D1. Only complete snapshots mark missing sightings. Missing is not closed.
2. Existing API: configure `LEDGER_BASE_URL` and secret `LEDGER_TOKEN` in Sites runtime settings and deploy the environment revision. `/opportunities?limit=100` is a candidate-only capped view under the old policy. It does not establish completeness. No closure inference from API omissions.
3. Review writes persist in D1, with optimistic version checks. Audit events record decisions and reconciliation notes. Drafts are never sent.

## Scoring and identity

Canonical HTTPS URL deduplicates exact listings after removing tracking parameters. Similar titles with distinct requisition URLs stay separate. SHA-256 IDs derive from canonical URLs. Normalized hashes use fixed-key JSON (`workspace-normalizer-v1`), distinct from the original Ledger's RFC 8785 contract. Raw hashes cover the whole feed. JSON pointers locate individual postings.

Title-based tracks: AI security, LLM red teaming, interpretability, model behavior, product security, product engineering. Scores: domain 55 or engineering 40; preferred city or explicit US remote 20; publication recency 15/8/0; sighting within 48h 10. Scores never establish work authorization, salary, seniority or qualification. Location matching is a review aid, not an eligibility predicate.

## Unattended refresh

Use the owner-private Sites service credential acquired from `get_site` at execution time. Never embed it in source or prompts. POST JSON `{}` to `/api/refresh` with `OAI-Sites-Authorization: Bearer <service credential>`. Read `/api/health` with the same header and verify persisted per-board success and timestamps. This path fetches the four fixed public boards, without visitor connector consent. Partial failures must be reported; retries are idempotent by canonical URL. Runs use a four-minute database lease to prevent overlapping reconciliation.

A linked schedule should run daily at 08:00 America/New_York. Weekly view is generated from live persisted decisions and fresh sightings; do not republish for refresh. Schedule-state is recorded only after native schedule creation succeeds. Never claim scheduled execution from a configured schedule alone.

## Setup limits at authoring

Original service URL, bearer secret, account-side D1/R2 provisioning, and original cron execution were not verified. The new Sites resources are separate. Confirm actual publication and database/readback before reporting them ready. Four boards are not comprehensive frontier-lab coverage. No automatic application submission, email, or LinkedIn messaging exists.

## Source evidence

Inspected 2026-11-13: https://github.com/mazze93/opportunity-ledger/blob/main/README.md ; `src/index.ts`, `src/queries.ts`, `config/targets.json`, `wrangler.jsonc`. The tracked Wrangler file still contains a placeholder D1 ID; that is not proof the production service is absent or deployed.
