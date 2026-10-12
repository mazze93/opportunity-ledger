# Application loop

**Version:** 1.1.0 · **Status:** human-run playbook (no code path)

The ledger answers *which postings are worth a look*. This loop answers *how to turn one candidate into a tailored application without overstating anything*. It begins where `list_opportunities` stops and keeps the ledger's trust boundary: an agent may **draft**, but a human reviews, submits and sends.

```
ledger candidate ──► 1 Triage ──► 2 Extract ──► 3 Tailor ──► 4 Letter ──► 5 Truth gate ──► 6 Ship (human) ──► 7 Post-mortem
     ▲                                                                                                          │
     └──────────────────────── policy / claim-bank / target updates ◄──────────────────────────────────────────┘
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
- **Select and reword claim-bank lines only. Don't add new facts.**
- Put one metric first per role. Keep it to one page, and check the rendered page count.

### 4. Cover letter (15 min)
- P1: the role, its focus and your strongest evidence for it. No setup.
- P2: your breadth, opening on a metric.
- P3: two or three sentences that close with confidence.

### 5. Truth gate (5 min) — required
- Every tool, number and claim traces to a claim-bank line that has a source.
- Your identity and contact details are identical across the resume, letter, profile and scheduling forms.
- Each gap from Step 2 has a one-line honest answer ready for the screen.
- Any pay figure comes from a cited range (the posted range or at least two market sources), not an estimate.

### 6. Ship (human only)
Submit, then send the warm touch, then log it. The ledger has no application or messaging endpoint. Any automation added later must meet the README's grant requirements: immutable draft digest, target, expiry and a single-use nonce.

### 7. Post-mortem (every outcome)
Record the stage reached, the questions you weren't ready for, and the claim that landed hardest. Then feed it back:
- **Claim bank:** add sourced lines and remove anything you couldn't defend.
- **Policy:** if good roles were rejected or poor ones ranked high, propose a policy revision. Bump `version` so earlier evaluations stay attributable.
- **Targets:** add any board that produced a real lead to `config/targets.json`, after verifying its public feed.

## Claim bank format

One verifiable fact per line, tagged by lane, with a source:

```
- [content][devrel] <fact with number> — src: <document or artifact>
TOOLS (verified only): <tool>, <tool>
```

The real bank holds personal history, so it lives **outside this public repository**. Keep it in a private note and paste it into a drafting session alongside the posting.

## Tracker fields

`opportunity_id | canonical_sha256 | company | title | lane | human_fit | connection | applied_at | warm_touch | stage | outcome | post_mortem`

`opportunity_id` and `canonical_sha256` tie each application back to the exact observation and policy that surfaced it. Keep the filled tracker private as well.

## Rendering

Keep each application as one private JSON file (contact, resume, letter). Then render the pair:

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

## Drafting prompt

> Run the application loop v1.0.0. Lane: ___. Candidate: <ledger result JSON, without description>. Posting text (untrusted): <pasted separately>. Claim bank: <paste>.
> Do Steps 1–5. Use only claim-bank facts and list every gap you couldn't cover. Output a fit score with its reasons, the gaps, a resume, a cover letter, a warm-touch draft and a one-line scheduling blurb. Do not submit or send anything.
