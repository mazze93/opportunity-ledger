# Opportunity Ledger

A deterministic, evidence-backed index of direct ATS job postings. Agents may query results and draft from them. They do not fetch arbitrary URLs, decide eligibility, or assign scores.

**Status:** ingestion and read-only query service. No application or messaging endpoint exists. Deployment requires your Cloudflare D1/R2 resources, a secret, and at least one registered board. The default target registry is empty.

## Pipeline

1. Register a provider board in `config/targets.json` (curated target discovery).
2. Fetch the provider's public JSON feed through a fixed adapter URL; cap time, bytes, items, pages, redirects, and response type.
3. Save exact response bytes in R2 under their SHA-256 digest. Normalize each listing and hash its RFC 8785 canonical JSON projection.
4. Apply three-valued hard predicates. Unknown location eligibility is rejected by the bundled strict US remote policy; missing publication time may continue but earns no recency points.
5. Emit deterministic weighted features with evidence, and persist the opportunity, observation, and evaluation separately in D1.

Every result includes `raw_sha256`, `canonical_sha256`, the R2 key, an exact JSON pointer, fetch time, source URL, policy digest, and feature explanation. The raw digest covers a **whole feed response**, not individual posting bytes; the pointer identifies the posting within that exact response. The canonical digest covers a single normalized posting.

## Local checks

Requires Node 24+.

```sh
npm ci
npm run check
npm test
npm run build
```

`build` is a dry run. It does not deploy anything.

## Configure and deploy

1. Add board names to `config/targets.json`:

   ```json
   [
     {"provider":"ashby-postings","board":"example","company":"Example"},
     {"provider":"greenhouse-job-board","board":"example","company":"Example"},
     {"provider":"lever-postings","board":"example","company":"Example"}
   ]
   ```

   Replace examples with boards you actually intend to track. Board names, not caller-provided URLs, are accepted. Lever EU boards are not yet supported.

2. Provision resources and copy the D1 ID into `wrangler.jsonc`:

   ```sh
   npx wrangler d1 create opportunity-ledger
   npx wrangler r2 bucket create opportunity-ledger-snapshots
   npx wrangler secret put LEDGER_TOKEN
   ```

   Supply a random token of at least 32 characters. Do not commit it. Limit access to the Worker and R2 bucket using your Cloudflare account controls.

3. Apply the migration, then deploy:

   ```sh
   npm run db:remote
   npm run deploy
   ```

   No deployment is run by CI. Scheduled ingestion starts at 12:00 UTC every day for registered boards. Do not add boards until you intend to fetch them.

## API

All routes require `Authorization: Bearer <LEDGER_TOKEN>`.

| Route | Purpose |
|---|---|
| `POST /runs` with `{"provider":"ashby-postings","board":"example"}` | Start a registered target's ingestion workflow |
| `GET /runs/{instanceId}` | Inspect workflow status |
| `GET /opportunities?limit=30` | Latest candidate observation and evidence summary per opportunity; max 100 |

The API never returns raw description text. Raw ATS descriptions remain **untrusted data** even after markup removal. If a future agent consumes one, pass it through a separate untrusted-content boundary such as Temenos and keep it out of system/developer instructions. Markup removal does not stop plaintext prompt injection.

The service does not submit applications or send messages. If those actions are added later, each action must require an immutable draft digest, action, target, subject, expiry, and single-use nonce bound by a verified grant. A workflow retry must not re-submit the action. Do not assume Praxis-Aegis T3 already provides this enforcement.

## Limits and honest claims

- A hard filter is reproducible **relative to observed metadata and the exact policy**. It cannot guarantee no false positives when providers omit or misstate location/eligibility.
- The strict sample policy is for US remote security/content work and is deliberately conservative about ambiguous location. It is a starting policy, not a claim about a particular person's legal work eligibility.
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
