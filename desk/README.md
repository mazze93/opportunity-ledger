---
title: Signal Desk view (desk.mazzeleczzare.com)
version: 0.1.0
created: 2026-11-25
status: built and tested, not deployed
tags: [desk, signal-desk, cloudflare-access, private, read-only]
---

# Signal Desk view

A private, read-only website at `desk.mazzeleczzare.com` that shows the private
`mazze93/signal-desk` repository (sweeps, plates, outreach, applications,
calendar, editorial gate, claim bank) next to the Opportunity Ledger's current
candidates. It sends nothing, writes nothing and publishes nothing.

## Why it is built this way

| Decision | Choice | Reason |
|---|---|---|
| Where the content comes from | Fetched at request time from GitHub with a read-only token | This repository is **public**; signal-desk is **private**. Nothing from signal-desk is bundled into the build or committed here, and the desk always shows the latest scheduled-task output without a redeploy. |
| Who can open it | Cloudflare Access on the hostname, **and** the Worker verifies the Access JWT itself | Two gates. If Access were ever misconfigured, the Worker still refuses every request that lacks a valid, signed Access assertion for the one allowed email. |
| Other URLs | `workers_dev: false`, `preview_urls: false` | A `*.workers.dev` or preview URL would sit outside Access. |
| Missing config | 503 for every request | Fails closed: without the three Access values no request is checked, so none is served. |
| Ledger link | Cloudflare service binding to the `opportunity-ledger` Worker | No public hop. Optional: the desk works and says "not connected" until the ledger is deployed. |
| Language | TypeScript | Matches the ledger in this repo (same `tsc`, Node test runner, Wrangler). A Rust/workers-rs build would add a second toolchain for ~500 lines of routing and rendering. |
| JavaScript in the page | None | CSP is `default-src 'none'` with inline styles only. Drafts are HTML-escaped before any Markdown formatting, so raw HTML in a draft shows as text. |

### How this fits the open ledger PRs

- **PR 4 (`workspace/`)** is a review app written for a hosting platform that
  authenticates visitors in front of it (it trusts an identity header and has
  identity-less service routes). Its README says not to deploy it on its own
  "without adding an authenticated gateway". This desk's `src/access.ts` is
  that gateway for Cloudflare: a follow-on change can mount the workspace under
  `/workspace` and replace its header check with `verifyAccessJwt`. This PR
  does not touch `workspace/`.
- **PR 7 / PR 8 (one-yes runner)** run on the Mac and keep application records
  outside this public repo. No file overlap. If those records live in
  signal-desk, the desk shows them read-only under `/sd/`.

## Files

| Path | Responsibility |
|---|---|
| `src/index.ts` | Request order: GET only → config → Access JWT → routes |
| `src/access.ts` | Access JWT verification (RS256, iss, aud, exp, nbf, email) and key cache |
| `src/github.ts` | Read-only signal-desk client and path guard |
| `src/markdown.ts` | Escape-first Markdown renderer |
| `src/ledger.ts` | Ledger candidates over the service binding |
| `src/views.ts`, `src/html.ts` | Page fragments, shell, security headers |
| `test/privacy.test.ts` | The privacy proof (see below) |

## Checks

From the repository root:

```sh
npx tsc -p desk/tsconfig.json
node --experimental-strip-types --no-warnings --test desk/test/*.test.ts
npx wrangler deploy -c desk/wrangler.jsonc --dry-run --outdir dist/desk
```

`test/privacy.test.ts` sends every route with no identity, with forged
identity headers (`cf-access-authenticated-user-email`, `oai-authenticated-user-id`,
a bearer token, an Access cookie), a malformed JWT, a correctly signed JWT for
the wrong audience and one for the wrong email. Each gets 403, no response
contains the private marker, and the fake GitHub records **zero** calls. It
also proves missing config gives 503 and writes give 405 before any fetch.

Mutation check (2026-11-25): disabling the identity check, the signature check,
the email check, the audience check, HTML escaping or the path guard, turning
`workers_dev` on, or fetching GitHub before the identity check each turns at
least one test red.

## Deploy (on your Mac, after your yes)

Run everything from the repository root:

```sh
cd ~/Projects/opportunity-ledger   # clone first if missing: gh repo clone mazze93/opportunity-ledger ~/Projects/opportunity-ledger
git fetch origin && git switch feat/signal-desk-view   # or main once merged
npm ci
npx wrangler login
```

### 1. Create the Access application first

Cloudflare dashboard → Zero Trust → Access → Applications → Add an application →
Self-hosted.

- Name: `signal-desk`
- Public hostname: `desk.mazzeleczzare.com` (path empty, so the whole host is covered)
- Policy: Action **Allow**, Include **Emails** → your email only
- Session duration: 24 hours
- Save, then copy the **Application Audience (AUD) Tag** from the app's overview.
- Your team domain is the `<team>.cloudflareaccess.com` host your Access login pages use.

### 2. Make the GitHub token

github.com → Settings → Developer settings → Fine-grained tokens → Generate.

- Resource owner: `mazze93`
- Repository access: **Only select repositories** → `signal-desk`
- Repository permissions: **Contents: Read-only** (Metadata read-only is added automatically)
- Expiration: 90 days (set a reminder to rotate)

### 3. Deploy, then add secrets

The first deploy creates the `desk` DNS record and certificate. Until the
secrets are in, the Worker answers 503 to everything, so this order is safe.

```sh
npx wrangler deploy -c desk/wrangler.jsonc
npx wrangler secret put ACCESS_TEAM_DOMAIN -c desk/wrangler.jsonc   # paste <team>.cloudflareaccess.com
npx wrangler secret put ACCESS_AUD -c desk/wrangler.jsonc           # paste the AUD tag
npx wrangler secret put ALLOWED_EMAIL -c desk/wrangler.jsonc        # paste your email
npx wrangler secret put SIGNAL_DESK_TOKEN -c desk/wrangler.jsonc    # paste the GitHub token
```

### 4. Verify

```sh
# Unauthenticated: expect a 302 to <team>.cloudflareaccess.com, never a 200.
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://desk.mazzeleczzare.com/sd/claim-bank.md
```

Then open https://desk.mazzeleczzare.com in your browser, sign in with your
email, and check the home page lists your newest sweeps and plates.

### 5. Connect the ledger (later, once the ledger Worker is deployed)

1. Uncomment the `"services"` line in `desk/wrangler.jsonc`.
2. Run:

```sh
npx wrangler secret put LEDGER_TOKEN -c desk/wrangler.jsonc   # same value as the ledger's LEDGER_TOKEN
npx wrangler deploy -c desk/wrangler.jsonc
```

3. Commit the uncommented line on a branch and open a PR:

```sh
git switch -c chore/desk-ledger-binding
git commit -am "desk: bind the opportunity-ledger service"
git push -u origin chore/desk-ledger-binding
```

Nothing else needs committing after a deploy: secrets live in Cloudflare and no
lockfile changes (the desk adds no dependencies).

## Not covered by the tests

- The real Cloudflare Access login flow and policy (checked by step 4 above).
- The Workers runtime itself; tests run in Node with WebCrypto. CI runs the
  Wrangler dry-run bundle.
- GitHub's real responses; the tests use a fake with the contents API's shape.
