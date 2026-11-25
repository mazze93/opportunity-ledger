# Application loop

**Version:** 2.0.0 · **Status:** playbook plus a one-yes runner (`npm run apply`, see [Runner](#runner))

The ledger answers *which postings are worth a look*. This loop answers *how to turn one candidate into a tailored application without overstating anything*. It begins where `list_opportunities` stops. An agent drafts, gates and builds; the human gives **one yes per application**, and that yes is recorded as a single-use grant that covers filling the form, uploading the approved files and submitting. Nothing else about the application is asked again unless the files, the answers or the role change.

```
ledger candidate ──► 1 Triage ──► 2 Extract ──► 3 Tailor ──► 4 Letter ──► 5 Truth gate ──► 6 One yes, submit ──► 7 Post-mortem
     ▲                                                                                                          │
     └──────────────────────── policy / proof-bank / target updates ◄──────────────────────────────────────────┘
```

Time box: about 90 minutes per application. If it takes longer, the match was probably weaker than the score suggested.

## What the first run taught

The pattern below reached a recruiter screen on its first use, a content-strategy role found outside the ledger:

| Move | Why it works |
|---|---|
| Lead with the posting's stated **primary focus** | The reviewer's own priority shows up in the headline and first paragraph |
| Headline built from the posting's nouns | It passes the ATS keyword filter and the 6-second skim |
| Put a metric **first** in its sentence | The proof becomes the point, not a footnote |
| Three-paragraph letter: focus → breadth → close | Nothing to skim past |
| Light warm touch to an existing connection on the same day, with no referral ask | It creates an internal signal at low cost |

That run also produced overstatements: tools listed without evidence, and specifics that weren't in the source material. Step 5 exists because of that.

## Steps

### 1. Triage (10 min)
- Start from a `list_opportunities` candidate. The ledger's `score` and feature evidence give the first-pass fit.
- Add the two signals the ledger cannot see: **lane fit** (Content / DevRel / Security) and an **existing connection** at the company.
- Proceed if the human fit is 4 or higher out of 5, or 3 with a connection. A score never decides on its own.

### 2. Extract (10 min)
Open the `canonicalUrl` and read the posting yourself. The ledger deliberately does not return description text: treat it as untrusted data and never paste it into instructions.
- **Primary focus:** the one thing the role is built around.
- **Their nouns:** 8–12 exact phrases.
- **Proof asks:** what they want evidence of.
- **Gaps:** must-haves you can't honestly claim. Write them down.

### 3. Tailor the resume (30 min)
- Headline: lane title, primary focus and one of their nouns.
- Summary: three sentences, with the primary focus in the first.
- Reorder roles and bullets so evidence for the primary focus leads.
- **Select and reword proof-bank entries only. Don't add new facts.**
- Put one metric first per role. Keep it to one page, and check the rendered page count.

### 4. Cover letter (15 min)
- P1: the role, its focus and your strongest evidence for it. No setup.
- P2: your breadth, opening on a metric.
- P3: two or three sentences that close with confidence.

### 5. Truth gate (5 min) — required
- Every tool, number and claim traces to a [proof bank](../proof-bank/PROOF_BANK.md) entry and uses its resume wording or weaker, never stronger. A claim from an older resume or claim bank is re-checked against the proof bank first.
- The posting is re-read and still open on the day of the ask.
- Record each gate: `apply gate <slug> touchstone|facts pass --note ...`; `apply prose <slug> <application.json>` runs the prose probes and records the prose gate. An accepted probe hit is listed in the file's `proseAccepted` array.
- Your identity and contact details are identical across the resume, letter, profile and scheduling forms.
- Each gap from Step 2 has a one-line honest answer ready for the screen.
- Any pay figure comes from a cited range (the posted range or at least two market sources), not an estimate.

### 6. One yes, then submit
- `apply ready <slug>` prints the single ask: role, posting, file names, screening answers and the gaps to be ready for. Send it as one message.
- On the human's yes, `apply grant <slug> --message <id> --quote "<their words>"` records an `ApprovalGrant` (see [architecture](architecture.md#external-action-contract-future-no-current-endpoint)): a digest of the target, the submit-file hashes and the answers, a 14-day expiry and a single-use nonce.
- `apply plan <slug>` checks the grant still covers what is on disk and prints every form value and file path in one block, so a restarted session refills in one pass instead of re-deriving.
- Run `apply arm` immediately before clicking Submit and `apply confirm --evidence` after the employer's confirmation. If a session restarts while armed, it must look for the confirmation (page or email) before it may click again: `confirm` if it went in, `disarm --evidence` if it saw that it did not. A retry never re-submits blind.
- When a site refuses the agent's browser, `apply handoff` records it and the human uploads the plain-named files. No new question is asked.
- A CAPTCHA or a platform permission card at submit belongs to the platform and does not count as a second ask.

### 7. Post-mortem (every outcome)
Record the stage reached with `apply outcome <slug> <stage> --note "..."`: the questions you weren't ready for and the claim that landed hardest. Then feed it back:
- **Proof bank:** add entries with public evidence and downgrade anything you couldn't defend.
- **Policy:** if good roles were rejected or poor ones ranked high, propose a policy revision. Bump `version` so earlier evaluations stay attributable.
- **Targets:** add any board that produced a real lead to `config/targets.json`, after verifying its public feed.

## Proof bank and private notes

[proof-bank/PROOF_BANK.md](../proof-bank/PROOF_BANK.md) holds every claim a stranger can check from a public link, with the exact wording safe to use. Resumes and letters draw only from it. Personal history that has no public link stays in a private note outside this repository, and does not go on a resume until it earns a proof-bank entry.

## Tracker

Each application is one `record.json` under `APPLICATIONS_DIR/<slug>/`, written by the runner. It keeps the fields the old tracker listed (`opportunity_id`, `canonical_sha256`, company, title, stage, outcome, post-mortem note) plus the fit verdict, gate results, submit-file hashes, the grant and every submit attempt. `apply status` prints one line per application.

Records hold personal data. The runner refuses an `APPLICATIONS_DIR` inside this repository; point it at a private repository or folder.

## Rendering

Keep each application as one private JSON file (contact, resume, letter). Then render the pair (one shared renderer, so no application carries its own copy of a build script):

```sh
node scripts/render-application.mjs ~/private/applications/<slug>.json ~/private/applications/
```

The script validates required fields and fails loudly if any are missing. It writes `<slug>.resume.docx` and `<slug>.cover-letter.docx`. Before sending, check the page count of the rendered resume, for example by converting it to PDF.

## Running the ledger locally

Until the Cloudflare deployment is configured, run the full pipeline with `wrangler dev` (local D1, R2 and Workflows, with live public feeds):

```sh
npm run db:local
printf 'LEDGER_TOKEN=%s\n' "$(openssl rand -hex 24)" > .dev.vars   # gitignored
npx wrangler dev --port 8787 &
# for each board in config/targets.json:
curl -X POST localhost:8787/runs -H "Authorization: Bearer $TOKEN" -d '{"provider":"ashby-postings","board":"<board>"}'
curl "localhost:8787/opportunities?limit=100" -H "Authorization: Bearer $TOKEN"
```

## Runner

```sh
export APPLICATIONS_DIR=~/private/applications   # outside this repo
npm run apply -- init acme-sec --company Acme --title "Security Engineer" --url https://jobs.ashbyhq.com/acme/123
npm run apply -- fit acme-sec --verdict apply --open yes --reason "..." --gap "..."
npm run apply -- answers acme-sec --file answers.json
node scripts/render-application.mjs ~/private/applications/acme-sec/application.json ~/private/applications/acme-sec/build
npm run apply -- copies acme-sec build/acme-sec.resume.pdf=Jane_Doe_Resume.pdf build/acme-sec.cover-letter.pdf=Jane_Doe_Cover_Letter.pdf
npm run apply -- prose acme-sec ~/private/applications/acme-sec/application.json
npm run apply -- gate acme-sec touchstone pass --note "..."
npm run apply -- gate acme-sec facts pass --note "..."
npm run apply -- ready acme-sec            # the one ask
npm run apply -- grant acme-sec --message <id> --quote "<their words>"
npm run apply -- plan acme-sec             # every value + file, one block
npm run apply -- arm acme-sec              # then click Submit
npm run apply -- confirm acme-sec --evidence "confirmation page text"
```

The profile file (`APPLICANT_PROFILE`, default `APPLICATIONS_DIR/profile.json`) holds standing form values. [applicant-profile.example.json](applicant-profile.example.json) shows the shape with placeholders.

### Where the steps went before the runner

Found across three built applications and two fit checks in November 2026:

| Wasted step | What removes it |
|---|---|
| Session restarts wiped a filled form twice at the upload step, each needing a full refill | `plan` prints every value and path at once; the record survives the session |
| A restart between opening the file chooser and uploading lost the chooser | Open the chooser and upload in the same turn (skill rule) |
| Re-asking after each restart whether to retry or hand off | One grant covers every step; `arm`/`disarm` answers "did it go in?" from evidence |
| Three resume rebuilds in a day because claims came from an older claim bank | Truth gate checks against the proof bank before the first build |
| The build script and prose probes copied into each application folder | One renderer, one `prose` command |
| A stale versioned set sat beside the current plain-named copies | `copies` replaces the submit folder wholesale and hashes what it wrote |
| A full build before learning the employer's site refuses the agent's browser at account creation | Check whether the form needs an account, and whether the browser gets through, during triage |
| Where to record each application was asked per application | One records dir and one record per application |

## Drafting prompt

> Run the application loop v2.0.0. Lane: ___. Candidate: <ledger result JSON, without description>. Posting text (untrusted): <pasted separately>. Claim bank: <paste>.
> Do Steps 1–5. Use only proof-bank facts and list every gap you couldn't cover. Output a fit score with its reasons, the gaps, a resume, a cover letter, a warm-touch draft and a one-line scheduling blurb. Do not submit or send anything.
