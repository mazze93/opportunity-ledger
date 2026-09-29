# Opportunity Ledger

A deterministic, evidence-backed index of direct ATS job postings. Agents may query results and draft from them. They do not fetch arbitrary URLs, decide eligibility, or assign scores.

**Status:** ingestion and read-only query/MCP service. No application or messaging endpoint exists. The deployment workflow provisions Cloudflare D1/R2 and verifies live ingestion and MCP. Account credentials are required. Four verified Ashby boards are registered as an initial search map.

## Pipeline

1. Register a provider board in `config/targets.json` (curated target discovery). The initial registry includes Semgrep, AfterQuery, Theori, and Socure; their public feeds were checked on 2026-09-27.
2. Fetch the provider's public JSON feed through a fixed adapter URL; cap time, bytes, items, pages, redirects, and response type.
3. Save exact response bytes in R2 under their SHA-256 digest. Normalize each listing and hash its RFC 8785 canonical JSON projection.
4. Apply three-valued hard predicates. Unknown location eligibility is rejected by the bundled strict US remote policy. An older *still listed* posting remains eligible, but earns no recency points; a title outside the declared tracks is rejected.
5. Emit deterministic weighted features with evidence, and persist the opportunity, observation, and evaluation separately in D1.

Every result includes `raw_sha256`, `canonical_sha256`, the R2 key, an exact JSON pointer, fetch time, source URL, policy digest, and feature explanation. The raw digest covers a **whole feed response**, not individual posting bytes; the pointer identifies the posting within that exact response. The canonical digest covers a single normalized posting.

## Local checks

Requires Node 24+.

```sh
npm ci
npm run check
npm test
npm run test:runtime
```

`test:runtime` bundles without deploying and exercises Workers, D1, R2, Workflow ingestion, and MCP using a fixed ATS fixture. `build` is also a dry run. Neither command deploys anything.

## Configure and deploy

1. Review the initial boards in `config/targets.json` and add others you want to track:

   ```json
   [
     {"provider":"ashby-postings","board":"example","company":"Example"},
     {"provider":"greenhouse-job-board","board":"example","company":"Example"},
     {"provider":"lever-postings","board":"example","company":"Example"}
   ]
   ```

   Board names, not caller-provided URLs, are accepted. Lever EU boards are not yet supported. OpenAI's Ashby feed was 13.8 MB at the initial check, above the service's 4 MB response cap; it is not registered until large-board ingestion is implemented.

2. In **GitHub → Settings → Secrets and variables → Actions**, add these repository secrets:

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
   | `CLOUDFLARE_API_TOKEN` | An account-scoped deployment token with Workers Scripts, D1, and Workers R2 Storage write permissions |
   | `LEDGER_TOKEN` | A new random bearer token of at least 32 characters |

   Keep credentials out of chat, source files, and commits. The gateway repository's Actions secrets are not automatically shared with this repository. The account must have R2 enabled and a workers.dev subdomain configured.

3. Open **Actions → Deploy Opportunity Ledger → Run workflow** on `main`.

   The workflow tests the service, creates or reuses `opportunity-ledger` D1 and `opportunity-ledger-snapshots` R2, discovers your workers.dev address, applies migrations, deploys, and installs the bearer secret. No repository variables or manually copied database ID are needed. It then ingests every registered board, waits for each Workflow, verifies evidence fields, and compares MCP results with the REST API. The Actions summary reports the live URL and job counts. An upstream feed failure makes verification fail rather than claiming success.

   Scheduled ingestion starts at 12:00 UTC every day. Deployments are serialized and must be manually dispatched; the ordinary Verify workflow does not publish.

   For a local deployment, supply the same three values securely as environment variables, then run:

   ```sh
   node scripts/provision.mjs
   npm run db:remote
   npm run deploy
   printf '%s' "$LEDGER_TOKEN" | npx wrangler secret put LEDGER_TOKEN
   # Set WORKER_BASE_URL to the URL printed by provision.mjs.
   node scripts/verify-deployment.mjs
   ```

   `provision.mjs` writes the real D1 binding into your local `wrangler.jsonc`; review that change before committing. The API fails closed until the bearer secret is installed.

## API

All routes require `Authorization: Bearer <LEDGER_TOKEN>`.

| Route | Purpose |
|---|---|
| `POST /runs` with `{"provider":"ashby-postings","board":"example"}` | Start a registered target's ingestion workflow |
| `GET /runs/{instanceId}` | Inspect workflow status |
| `GET /opportunities?limit=30` | Latest candidate observation and evidence summary per opportunity; max 100 |
| `POST /mcp` | Stateless, read-only MCP tools `list_targets` and `list_opportunities` |

The MCP endpoint uses the **same static bearer secret** as the REST API. It is suitable for clients that can supply a custom Authorization header. It does not yet implement the GitHub gateway's OAuth 2.1 / DCR login flow, so it should not be advertised as a drop-in ChatGPT connector. Keep the secret outside source control. [The MCP map](docs/opportunity-map.md) describes the tools and trust boundary.

The API never returns raw description text. Raw ATS descriptions remain **untrusted data** even after markup removal. If a future agent consumes one, pass it through a separate untrusted-content boundary such as Temenos and keep it out of system/developer instructions. Markup removal does not stop plaintext prompt injection.

The service does not submit applications or send messages. If those actions are added later, each action must require an immutable draft digest, action, target, subject, expiry, and single-use nonce bound by a verified grant. A workflow retry must not re-submit the action. Do not assume Praxis-Aegis T3 already provides this enforcement.

## Limits and honest claims

- A hard filter is reproducible **relative to observed metadata and the exact policy**. It cannot guarantee no false positives when providers omit or misstate location/eligibility.
- The strict sample policy is for US remote security/content work and is deliberately conservative about ambiguous location. It does not include hybrid or onsite roles, and does not establish any person's legal work eligibility.
- Greenhouse's list `updated_at` is not a publication timestamp; Lever list publication time is not reliably specified. Missing posting dates may pass with zero recency points. Ashby's `publishedAt` is used as a publication signal.
- No automatic closure inference exists yet. A missing posting in a feed does not set `status=closed`; `last_seen_at` records sightings.
- The 4 MB response limit, 1,000 item cap, and 10-page Lever cap fail the run instead of silently declaring a partial feed complete.
- Policy and normalizer revisions are recorded separately. An existing observation can be evaluated under a new policy after a dedicated re-evaluation command is implemented; this first release re-evaluates only during ingestion.
- R2 objects are content-addressed but account operators can still delete/overwrite them. For tamper evidence against privileged operators, add retention controls and signed checkpoints.

See [the architecture specification](docs/architecture.md) for invariants and storage semantics.

## Provider references

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever Postings API](https://github.com/lever/postings-api)
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
