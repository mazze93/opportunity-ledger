---
title: Proof bank
description: Every career claim that a public link can back, with the exact wording safe to use on a resume. Resumes and cover letters draw only from here.
checked: 2026-11-14
tags: [career, claims, resume, devrel, security]
---

# Proof bank

Every resume line and cover letter sentence should trace to an entry here. If it isn't here, it doesn't go out.

This file holds only what a stranger can check from a public link. Personal history, private repositories and contact details stay out of it, as [[application-loop]] already requires for the claim bank.

## How to read an entry

- **Claim:** what is true, in one plain sentence.
- **Resume wording:** the strongest wording the evidence supports. Use it as written, or weaker. Never stronger.
- **Evidence:** links a reader can open.
- **Date:** when the thing happened.
- **Site page:** his page for it on [mazzeleczzare.com](https://mazzeleczzare.com/), the intended source of truth, and whether it agrees with the outside record. A disagreement is a fix for the site or for the record, not a verdict.
- **Status:** one of four.
  - `verified-third-party`: a source he doesn't control confirms it (GitHub Advisory Database, Snyk, a publisher's byline).
  - `verified-artifact`: his own public repository, release or site shows the thing exists and does what the wording says. It proves the work exists, not how anyone rates it.
  - `first-hand`: his own account of his own work, stated on his site. Use it as written. Outside links that support it are listed; no outside source has to repeat it for it to stand.
  - `unverified`: no public source confirms it. The reason is given. Don't use it until it moves up.
- **Roles:** SEC (Security Engineer), DEVREL (Developer Relations), WRITING (technical writing and content), RESEARCH (AI evals and safety research).

All statuses were checked on 2026-11-14 unless an entry says otherwise.

## Name note

The public credits use different forms of one identity. Say so if a reader might not connect them.

- GitHub advisories credit the account `mazze93`.
- Snyk credits "Mazze LeCzzare Frazer".
- One 2023 byline is under a previous surname (see W1).
- Several third-party sources below (a lab alumni page, a dissertation, mudstack's blog, a guest's LinkedIn post) also credit that earlier name. Until he decides whether to link sources that show it, those entries say `link held` and the links stay in his private notes. The fact is still verified; only the link is held.

---

## 1. Security research

### S1. Finder, CVE-2026-59869 (js-yaml, High)

- **Claim:** He found a quadratic CPU-consumption bug in js-yaml's merge-key handling, rated High (CVSS 3.1 base 7.5), affecting 3.x before 3.15.0 and 4.x before 4.3.0.
- **Resume wording:** "Credited Finder, CVE-2026-59869 (GHSA-52cp-r559-cp3m): High-severity (7.5) denial of service in js-yaml 3.x/4.x, a YAML parser with more than 300 million weekly npm downloads."
- **Evidence:**
  - [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) (credits: `mazze93`, Finder)
  - [Snyk SNYK-JS-JSYAML-17900054](https://security.snyk.io/vuln/SNYK-JS-JSYAML-17900054) (credit: Mazze LeCzzare Frazer; Snyk score 8.7, high)
  - [Snyk SNYK-JAVA-ORGWEBJARSNPM-17900055](https://security.snyk.io/vuln/SNYK-JAVA-ORGWEBJARSNPM-17900055) (WebJars repackaging, same credit)
  - [npm: js-yaml](https://www.npmjs.com/package/js-yaml) (weekly downloads shown as 386,220,519)
- **Date:** GitHub advisory published 2026-07-02; Snyk 2026-07-09.
- **Site page:** [/work/, Vulnerability Research](https://mazzeleczzare.com/work/). Agrees.
- **Status:** `verified-third-party`.
- **Roles:** SEC, RESEARCH.

### S2. Finder, CVE-2026-59868 (js-yaml 5.x, Moderate)

- **Claim:** He found the same class of bug in js-yaml 5.0.0 to 5.1.0, rated Moderate (CVSS 3.1 base 5.3) by GitHub.
- **Resume wording:** "Credited Finder, CVE-2026-59868 (GHSA-g796-fgmg-93mv): denial of service in js-yaml 5.x."
- **Evidence:**
  - [GHSA-g796-fgmg-93mv](https://github.com/advisories/GHSA-g796-fgmg-93mv) (credits: `mazze93`, Finder)
- **Date:** 2026.
- **Site page:** [/work/, Vulnerability Research](https://mazzeleczzare.com/work/). Agrees (Moderate 5.3).
- **Status:** `verified-third-party` for the GitHub credit and the Moderate rating.
  - Unverified: a Snyk credit for this CVE. No Snyk advisory page naming him was found.
  - Snyk's [js-yaml 5.1.0 package page](https://security.snyk.io/package/npm/js-yaml/5.1.0) rates a 5.x merge-key issue high, but that page carries no credit. Say "Moderate" or give no severity.
- **Roles:** SEC, RESEARCH.

### S3. Analyst, CVE-2026-53550 (js-yaml, Moderate)

- **Claim:** He is one of five credited analysts on a repeated-alias merge-key denial of service that another researcher reported.
- **Resume wording:** "Credited Analyst (one of five), CVE-2026-53550 (GHSA-h67p-54hq-rp68)."
- **Evidence:** [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) (Reporter: another researcher; Analysts include `mazze93`).
- **Site page:** [/work/, Vulnerability Research](https://mazzeleczzare.com/work/). Agrees ("credited analysis contribution").
- **Status:** `verified-third-party`.
- **Roles:** SEC.

### S4. Public coordinated-disclosure policy (Secure Pride)

- **Claim:** Secure Pride publishes a security.txt that points to a public disclosure policy, and its site describes a threat model and an AI safety scanner released under Apache 2.0.
- **Resume wording:** "Founded Secure Pride; published its coordinated vulnerability disclosure policy and security.txt."
- **Evidence:**
  - [securepride.org](https://securepride.org)
  - [security.txt](https://securepride.org/.well-known/security.txt)
- **Site page:** [/project/secure-pride/](https://mazzeleczzare.com/project/secure-pride/). The site gives two titles: "Founder & Exec. Director" on /work/ and "Founder & Editor-in-Chief" on [/work/research-program-operations/](https://mazzeleczzare.com/work/research-program-operations/). Pick one.
- **Status:** `verified-artifact` that the site, security.txt and policy link exist.
  - Unverified: his name as founder or policy author. No fetched page named him. The /about and /security-policy pages did not load through the fetcher.
  - Fix: add a founder line to /about, or a credit line to the policy page.
- **Roles:** SEC, DEVREL.

---

## 2. AI evals and safety research

### E1. js-yaml DoS eval (Inspect AI)

- **Claim:** He built an Inspect AI task that measures whether a model can produce inputs triggering the js-yaml merge-key slowdown. It has 10 samples, one per js-yaml version, and two scoring modes, amplification and growth. The pipeline is verified; no model results are published.
- **Resume wording:** "Built an Inspect AI evaluation for parser denial-of-service: 10 version-pinned samples, two scorers (amplification and growth-rate), harness checks passing in CI. Pipeline verified; no model results published yet."
- **Evidence:**
  - [mazze93/js-yaml-dos-eval](https://github.com/mazze93/js-yaml-dos-eval) (MIT, CI)
  - README: growth slopes of 1.90 (r² 0.999), 1.90 (r² 1.000) and 2.05 (r² 0.995) on js-yaml 3.15.0, 4.3.0 and 5.2.0, over 64 to 512 KiB inputs
  - The local harness ran 71 of 71 checks passing on 2026-11-14, and the `test` CI job on main passed the same day.
- **Date:** growth scoring merged 2026-11-13.
- **Site page:** none found. Add it to /work/ or /studio/.
- **Status:** `verified-artifact`.
- **Do not say:** that any model was evaluated, or any score. The README says it makes no claim about model performance.
- **Roles:** RESEARCH, SEC.

### E2. Prompt-injection detection gate and adversary runner

- **Claim:** He wrote a prompt-injection detection gate (aletheia) and an adversary runner to test it (apatea). Both have CI.
- **Resume wording:** "Built a prompt-injection detection gate and a companion adversarial test runner, both with CI."
- **Evidence:**
  - [mazze93/aletheia](https://github.com/mazze93/aletheia)
  - [mazze93/apatea](https://github.com/mazze93/apatea)
- **Site page:** [/project/aletheia/](https://mazzeleczzare.com/project/aletheia/). Agrees.
- **Status:** `verified-artifact`. No detection rates are claimed.
- **Roles:** RESEARCH, SEC.

### E3. MAESTRO in Practice

- **Claim:** He wrote a 42-page report applying the MAESTRO agentic-AI threat-modelling framework to 12 case studies, conducted in June 2026.
- **Resume wording:** "Author, MAESTRO in Practice: a 42-page applied threat-modelling study of 12 agentic-AI case studies (self-published, 2026)."
- **Evidence:** [mazzeleczzare.com/blog/maestro-in-practice](https://mazzeleczzare.com/blog/maestro-in-practice/).
- **Site page:** [MAESTRO in Practice (PDF)](https://mazzeleczzare.com/papers/maestro-in-practice.pdf) and [/project/maestro/](https://mazzeleczzare.com/project/maestro/). Agrees.
- **Status:** `verified-artifact` (self-published, not peer-reviewed).
- **Roles:** SEC, RESEARCH, WRITING.

### E4. AI behaviour research programme

- **Claim:** He runs a public research site with an ethics page and a method audit. Its own text says the smoke releases show technical execution only, not findings.
- **Resume wording:** "Running an independent AI-behaviour research programme with published ethics and method-audit pages; preregistered pilot under way."
- **Evidence:**
  - [research.mazzeleczzare.com](https://research.mazzeleczzare.com/)
  - [ethics](https://research.mazzeleczzare.com/ethics.html)
  - [method audit](https://research.mazzeleczzare.com/method-audit.html)
  - [mazze93/ai-behavior-research](https://github.com/mazze93/ai-behavior-research) (tag v0.1.0-rc.1)
  - [mazze93/authority-without-assertion](https://github.com/mazze93/authority-without-assertion) (pilot stage, preregistration)
- **Site page:** [/work/, item 04](https://mazzeleczzare.com/work/). Agrees; the site itself says a smoke test is not a completed pilot.
- **Status:** `verified-artifact`.
- **Do not say:** "findings", "results" or "published research". There are none yet.
- **Roles:** RESEARCH.

---

## 3. Engineering and shipped tools

### T1. github-mcp-gateway

- **Claim:** He built and released a remote MCP server on Cloudflare Workers that gives MCP clients GitHub access over OAuth 2.1.
  - It has 24 tools.
  - It supports PKCE, Dynamic Client Registration and Client ID Metadata Documents.
  - Repo access is limited to what the user ticks on the GitHub App install screen.
  - Tests run on workerd.
  - v1.1.0 ships a cosign-signed toolchain image with SBOM and SLSA provenance.
- **Resume wording:** "Built and released github-mcp-gateway (v1.1.0): a remote MCP server on Cloudflare Workers with 24 GitHub tools, OAuth 2.1 (PKCE, DCR, CIMD), per-repository access via GitHub App installation, tests on workerd, and a cosign-signed release with SBOM and SLSA provenance."
- **Evidence:**
  - [mazze93/github-mcp-gateway](https://github.com/mazze93/github-mcp-gateway) (tags v1.0.0, v1.1.0; CI, CodeQL, deploy and release workflows)
  - [Glama listing](https://glama.ai/mcp/servers/mazze93/github-mcp-gateway)
- **Date:** v1.1.0 released 2026-09-13.
- **Site page:** none found. Add it to /work/.
- **Status:** `verified-artifact`. The Glama listing is third-party, but it only indexes the repo.
- **Do not say:** a test count. "66 tests" no longer matches; the suite now has about 90 test call sites. Count with the test runner before using any number.
- **Roles:** SEC, DEVREL.

### T2. Stratum

- **Claim:** He built and released Stratum, a project ledger with 16 contract invariants, implemented twice (a Python reference and a TypeScript port). Its v0.5.0 release is signed, and it has a live site.
- **Resume wording:** "Built and released Stratum (v0.5.0): a project-state ledger with 16 contract invariants implemented in both Python and TypeScript, with CI, CodeQL and a signed release."
- **Evidence:**
  - [mazze93/stratum](https://github.com/mazze93/stratum) (tags v0.4.0, v0.5.0)
  - [stratum.mazzeleczzare.com](https://stratum.mazzeleczzare.com/)
- **Date:** v0.5.0 released 2026-11-13.
- **Site page:** [/work/, item 01](https://mazzeleczzare.com/work/). Agrees.
- **Status:** `verified-artifact`.
  - Unverified: npm (`@stratum-ledger/cli`) and Homebrew availability. The npm page did not load.
- **Roles:** DEVREL, SEC.

### T3. Stele

- **Claim:** He built and released Stele.
  - It watches inputs and extraction responses with 13 deterministic tripwires (prompt injection, authority impersonation, hidden instructions, credential leaks, schema drift).
  - Every tripwire writes to an audit trail.
  - The v1.2.0 release notes report 147 app tests and 56 core tests passing in hosted CI.
- **Resume wording:** "Built and released Stele (v1.2.0): 13 deterministic tripwires for prompt injection, impersonation, hidden instructions and credential leaks, each logged to an audit trail; 200+ tests passing in CI."
- **Evidence:**
  - [mazze93/stele](https://github.com/mazze93/stele) (tags v1.0.0 to v1.2.0)
  - [stele.mazzeleczzare.com](https://stele.mazzeleczzare.com/)
- **Date:** v1.2.0 released 2026-10-17.
- **Site page:** [/work/, item 02](https://mazzeleczzare.com/work/) and [/project/stele/](https://mazzeleczzare.com/project/stele/). Agrees.
- **Status:** `verified-artifact`.
- **Roles:** SEC, RESEARCH.

### T4. Claude Code skills marketplace

- **Claim:** He wrote and publishes a Claude Code plugin marketplace with 6 plugins and 30 skills. It installs in one command and has a live storefront.
- **Resume wording:** "Author of a Claude Code plugin marketplace: 6 plugins, 30 skills, one-command install, public storefront."
- **Evidence:**
  - [mazze93/claude-code-skills](https://github.com/mazze93/claude-code-skills) (all commits his)
  - [store.mazzeleczzare.com](https://store.mazzeleczzare.com)
  - Install: `/plugin marketplace add mazze93/claude-code-skills`
- **Site page:** no page on /work/ or /studio/; the store subdomain is the only page.
- **Status:** `verified-artifact`.
- **Do not say:** sales, revenue, users or installs. Nothing public shows them.
- **Roles:** DEVREL, WRITING.

### T5. Smaller shipped tools

All are `verified-artifact`. Use them as a list, not as headline claims.

- **adaptive-response:** released v1.0.0, CI and release workflows. [repo](https://github.com/mazze93/adaptive-response)
- **temenos:** evidence-gated runtime with CI and a Snyk evidence workflow. [repo](https://github.com/mazze93/temenos)
- **secure-container-template:** v0.1.0. [repo](https://github.com/mazze93/secure-container-template)
- **git-forensics-agent:** CI. [repo](https://github.com/mazze93/git-forensics-agent)
- **github-hardening-skills:** v1.0.0. [repo](https://github.com/mazze93/github-hardening-skills)
- **distinctive-frontend-design:** v1.0.0. [repo](https://github.com/mazze93/distinctive-frontend-design)

### T6. In progress (say "in progress")

All are `verified-artifact` for existence only. Their own pages say they aren't finished.

- **rustpress:** the README says "in-progress delivery, not a completed product release". [repo](https://github.com/mazze93/rustpress), [site](https://press.mazzeleczzare.com/)
- **context-synapse:** the site says "still in development". [repo](https://github.com/mazze93/context-synapse), [site](https://contextsynapse.mazzeleczzare.com/)
- **agelace:** v0.2.0-beta.1. [repo](https://github.com/mazze93/agelace)
- **theatre-of-dependencies:** early seed stage, no release tag yet. [repo](https://github.com/mazze93/theatre-of-dependencies)

### T7. Tennis 919 app (co-authored)

- **Claim:** He contributed to the Tennis 919 app repository with CodeQL. Another account wrote more of its commits (13 against his 9).
- **Resume wording:** "Co-developed the Tennis 919 club app."
- **Evidence:** [mazze93/Tennis919-app](https://github.com/mazze93/Tennis919-app).
- **Site page:** the app has no page. [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/) lists the Tennis 919 role.
- **Status:** `verified-artifact`.
- **Roles:** DEVREL.

---

## 4. DevRel, content and community

### D1. Clear as Mud podcast, producer and host (mudstack)

- **Claim:** He produced and hosted mudstack's Clear as Mud interview series, 27 episodes, 2022 to 2023, and owned guest research, outreach, scheduling, production and distribution.
- **Resume wording:** "Produced and hosted 27 episodes of Clear as Mud, mudstack's interview series with game, XR and creative-technology leaders (2022 to 2023)."
- **Evidence:**
  - Vani Balgam's LinkedIn post on her episode (E37, August 2023) thanks him "for the opportunity to join the podcast", and his own post resharing it says he met her at GDC and "knew immediately that I wanted her to be a guest on the Clear as Mud podcast at mudstack". Search engines don't show either post, so the evidence is his screenshot of the two (`link held`).
  - Dave Branco's LinkedIn post of 2023-05-23, on his episode (E33), says he invited Branco onto the show, and his reply thanks Branco "for coming on the podcast" (`link held`).
  - [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/), his site: "Produced and hosted seven webinars and 27 episodes of the Clear as Mud interview series; owned speaker research and outreach, scheduling, run-of-show, live production, and post-event distribution." His site is the intended source of truth for the full role and the count.
  - [Spotify: Clear as Mud](https://open.spotify.com/show/50eMqYFskikUzz4EuoYTyf), the show itself (37 episodes, last on 2023-08-10). The last five episodes: [Dave Branco, 2023-05-22](https://open.spotify.com/episode/1343ucXtyEdQz97zdnBZoq), [Dan Fadness, 2023-06-08](https://open.spotify.com/episode/31syWj1lZrHDtN1lUs9BZR), [James Adkins, 2023-07-11](https://open.spotify.com/episode/4xVn00xHcWLpQR4oQb7HXc), [David Tucciarone, 2023-07-27](https://open.spotify.com/episode/3eocwPu6kDZX0Ewevy8Rtl), [Vani Balgam, 2023-08-10](https://open.spotify.com/episode/0iWbRR6HlEQm20F0Fmq05S).
  - [mudstack 2023 roadmap webinar, 2022-12-06](https://www.youtube.com/watch?v=UJ6ugcnTooA): he describes his podcast role in his own words.
- **Date:** 2022 to 2023.
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/) (in Evidence). [/work/, item 16](https://mazzeleczzare.com/work/) words it differently: "Founded and hosted", "twenty-six-plus episodes across Spotify and Apple". **One fix for the site:** "Founded". His LinkedIn post of 2022-10-18, announcing the job, already links "our weekly podcast", so the show was running when he joined. "Produced and hosted", as on the Research Program Operations page, avoids the question.
- **Status:** `verified-third-party`. Two guests credit him in their own posts for having them on the show (Vani Balgam, E37; Dave Branco, E33), and his site states the full role and count.
- **Optional extra:** audio timestamps. The show's RSS feed wasn't reachable from here on 2026-11-14. It isn't in Apple's podcast directory under this name, its old Podbean site now redirects to a sign-in page, Spotify shows no transcript, and the audio hosts couldn't be reached from this workspace. If the feed URL turns up (Spotify for Creators shows it in the show settings), timestamps of "and I'm your host Mazze" can be added here.
- **Roles:** DEVREL, WRITING.

### D2. mudstack articles on 80.lv (team byline)

- **Claim:** 80.lv ran mudstack company pieces in 2023 under the byline "The mudstack team".
- **Resume wording:** "Contributed to mudstack's 80.lv features (team byline)." Don't claim sole authorship.
- **Evidence:**
  - [VR Vision feature, 2023-09-15](https://80.lv/articles/unveiling-the-vr-vision-team-s-journey-crafting-virtual-worlds-and-future-innovations)
  - [Pricing announcement, 2023-06-12](https://80.lv/articles/mudstack-goes-free-for-artists-simplifies-pricing-introduces-new-team-plan)
  - [Rapid-iteration piece, 2023-11-10](https://80.lv/articles/3-tips-on-rapid-iteration-for-digital-art-teams-launch-your-game-faster)
  - [Author page](https://80.lv/author/the-mudstack-team)
- **Site page:** none. The site names only the GDC piece (W1).
- **Status:**
  - `verified-third-party` that the pieces exist.
  - Unverified: which of them he wrote.
- **Roles:** DEVREL, WRITING.

### D3. mudstack webinars and livestream (host)

- **Claim:** He produced and hosted seven mudstack webinars and livestreams, December 2022 to May 2023.
- **Resume wording:** "Produced and hosted seven mudstack webinars and livestreams for game artists and studios (2022 to 2023), including a publisher-pitching panel, the 2023 product roadmap and a livestream with director HaZ Dulull."
- **Evidence (mudstack's YouTube channel, captions read 2026-11-14):**
  - [2023 roadmap webinar, 2022-12-06](https://www.youtube.com/watch?v=UJ6ugcnTooA): he introduces himself and hosts.
  - [Pitch to Publisher](https://www.youtube.com/watch?v=rdsgB1Uoi-Q): "I'll be your host".
  - [Feedback-flow product update](https://www.youtube.com/watch?v=CzWYQMeyjTM): a colleague thanks him for the introduction.
  - Livestream with HaZ Dulull, 2023-05-26: he hosts (`link held`).
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/): "Produced and hosted seven webinars". Agrees.
- **Status:**
  - `first-hand`: seven webinars, from his site.
  - `verified-third-party`: four of them, each with his role shown in the recording. The other three weren't matched to a recording on 2026-11-14; mudstack's blog write-up of the Get Hired webinar (2023-04-28) is bylined to him (`link held`).
- **Roles:** DEVREL.

### D4. mudstack Content and Community Manager

- **Claim:** mudstack's own blog bio called him "the Content and Community Manager at mudstack" in 2023, and he wrote bylined posts for its blog and LinkedIn articles.
- **Resume wording:** "Content and Community Manager, mudstack (2022 to 2023)." For writing volume, say "bylined blog posts and articles"; give a number only once it's counted.
- **Evidence:** mudstack blog posts of 2023-03-24, 2023-05-02, 2023-07-05, 2023-07-21, 2023-08-31 and 2023-09-01, and LinkedIn articles of 2023-02-02, 2023-02-09 and 2023-02-17, all bylined (`link held`). mudstack shut down on 2026-09-14 and its blog author page now redirects, so save copies of the posts before they go.
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/): "Community and Content Manager", October 2022 to November 2023, "50+ in total". mudstack's bio says "Content and Community Manager"; his 2022-10-18 post and the March 2023 80.lv byline say "Content Writer", so the title likely changed during the job. The count is unconfirmed.
- **Status:**
  - `verified-third-party`: the title and the bylines (employer-published).
  - Not yet counted: "50+ technical articles". Ten bylined pieces were found on 2026-11-14; that is what the search found, not a total.
- **Roles:** DEVREL, WRITING.

---

## 5. Research background

### R1. Research lab operations, UC Davis (Luck Lab, then Bliss-Moreau Lab)

- **Claim:** He was a lab manager assistant in Steven Luck's lab and then a junior specialist (junior staff) in Eliza Bliss-Moreau's lab at UC Davis.
- **Resume wording:** "Lab Manager Assistant, Luck Lab, UC Davis; then Junior Specialist, Bliss-Moreau Lab, UC Davis." Add month ranges only from offer letters or HR records.
- **Evidence:**
  - Luck Lab alumni page: "Former Lab Manager Assistant", now "Junior Specialist, Bliss-Moreau Lab, UC Davis" (`link held`).
  - Joey A. Charbonneau, PhD dissertation, UC Davis 2024, acknowledgments (p. v): thanks him among "the many junior staff members" of the Bliss-Moreau Lab (`link held`).
  - [mazzeleczzare.com/work/research-program-operations](https://mazzeleczzare.com/work/research-program-operations/) (self-published).
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/) matches the Bliss-Moreau junior specialist role. **Disagrees on the Luck Lab title:** the site says "Research Assistant / Laboratory Manager" there, the lab's page says "Lab Manager Assistant", and [/work/, item 21](https://mazzeleczzare.com/work/) puts "Laboratory Operations Manager (Junior Specialist)" in the Luck Lab.
- **Status:**
  - `verified-third-party`: both titles and both labs.
  - Not shown: dates. The dissertation credits no specific task; its Chapter 2 author list doesn't include him, and Chapters 3 to 6 weren't in the text read.
  - Steven Luck's public CVs (February 2022 and January 2025, read in full) don't name him. The lab's website does. If another CV version names him, add it here.
- **Roles:** RESEARCH.

### R2. ERP Boot Camp support

- **Claim:** Steven Luck and Emily Kappenman run the UC-Davis/SDSU ERP Boot Camp, a 10-day NIH-funded workshop (R25MH080794). He says he supported it while in the Luck Lab.
- **Resume wording:** "Supported logistics for the NIH-funded UC-Davis/SDSU ERP Boot Camp, a 10-day intensive in EEG/ERP methods for about 30 researchers per cohort." If he supported more than one cohort, say how many: "two cohorts, about 60 researchers in all".
- **Evidence:**
  - [erpinfo.org: ERP Boot Camp](https://erpinfo.org/the-erp-boot-camp): "held each year at the UC-Davis Center for Mind & Brain or at San Diego State University"
  - [erpinfo.org: application info](https://erpinfo.org/application-info): "Only 30 participants can be accepted each year"
  - Luck's 2022 CV lists the in-person camps: UC Davis 2007 to 2011, 2013 to 2017 and 2019; SDSU in August 2021; 2020 cancelled for COVID and replaced with virtual webinars.
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/): "Helped coordinate the annual 10-day NIH-funded ERP Boot Camp", with cross-site coordination. Agrees with erpinfo.org. The "about 60" figure comes from a CV, not the site.
- **Status:**
  - `verified-third-party`: the camp, its funding, its sites and its size.
  - Unverified: his role, and which years.
- **Do not say:** "about 60 researchers annually", or that it ran at San Jose State. The camp's own pages describe one 30-person camp a year, alternating between UC Davis and San Diego State.
- **Roles:** RESEARCH, DEVREL.

### R4. Counterfeit-banknote study, Luck Lab

- **Claim (his site):** he ran data collection for a counterfeit-banknote ERP study and trained visiting researcher Daniel Dodgson; the site says the work is acknowledged in Dodgson & Raymond, Scientific Reports 12:2076 (2022).
- **Site page:** [/work/, item 18](https://mazzeleczzare.com/work/). **Disagrees with the paper.**
- **Evidence:** [Dodgson & Raymond 2022](https://doi.org/10.1038/s41598-022-05972-8). Its acknowledgements thank only the Bank of Canada, the Bank of England, the Reserve Bank of Australia and the US Federal Reserve. Its participants were 26 University of Birmingham students. ERPLAB is cited as software, with no individual credit.
- **Status:** unverified. The paper doesn't name him. That doesn't show the work didn't happen; it may belong to another paper or an unpublished UC Davis arm of the study.
  - Fix: the record that does name him, or rewording the site so it doesn't point to this paper.
- **Roles:** RESEARCH, SEC.

### R3. Degree

- **Claim:** B.S. in Quantitative Psychology with a neuroscience emphasis, UC Davis, 2020.
- **Resume wording:** "B.S., Quantitative Psychology (neuroscience emphasis), University of California, Davis, 2020." Keep this exact form. Don't write "Quantitative Psychology and Neuroscience", which reads as two majors.
- **Site page:** [Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/): "B.S., Quantitative Psychology". Agrees. [/work/, item 21](https://mazzeleczzare.com/work/) says "Quantitative Psychology & Neuroscience", which disagrees.
- **Status:** unverified publicly; degrees are normally confirmed by background check. Regents Scholar likewise.
- **Roles:** all.

---

## 6. Writing

### W1. "Networking at GDC 2023" (80.lv, bylined)

- **Claim:** He wrote an 80.lv article on networking at GDC 2023, bylined to him under a previous surname as a content writer at mudstack.
- **Resume wording:** "'Networking at GDC 2023: Tips for Artists, Game Developers, and Industry Leaders,' 80.lv, March 2023 (bylined under a previous surname)."
- **Evidence:** [80.lv article, 2023-03-15](https://80.lv/articles/networking-at-gdc-2023-tips-for-artists-game-developers-and-industry-leaders).
- **Site page:** [/work/, item 15](https://mazzeleczzare.com/work/). Agrees.
- **Status:** `verified-third-party`.
- **Roles:** WRITING, DEVREL.

### W2. Self-published essays and papers

- **Claim:** He publishes long-form technical writing on his own site. The writing index lists, among others:
  - the Intentional Fragility paper
  - Cognitive Topology (a 34-page white paper)
  - "The Page Said Verified" (2026-10-18)
  - "The Tripwire That Didn't Fire"
  - "What We Don't Know Yet"
- **Resume wording:** "Technical essays and white papers on AI security and evaluation at mazzeleczzare.com/writing." Name one or two pieces, each with its link.
- **Evidence:** [mazzeleczzare.com/writing](https://mazzeleczzare.com/writing/). The [/work](https://mazzeleczzare.com/work/) page already tiers his own claims as Live, Published, Acknowledged or Self-reported.
- **Site page:** [/writing/](https://mazzeleczzare.com/writing/). This is the page.
- **Status:** `verified-artifact` (self-published).
- **Roles:** WRITING, DEVREL, RESEARCH.

### W3. "The Break Is the Record" (September 2026)

- **Status:** unverified. It is listed on a draft resume, but no public link was checked. Add the link here, then use it.
- **Roles:** WRITING.

---

## Private evidence (no links)

These may be true. Only private records show them, so this public file doesn't link them. Show them in an interview, or under NDA, if asked.

- Additional security research in private repositories, not yet disclosed. Don't name a target, a bug or a repository until a fix and an advisory are public.
- Tennis 919 membership, growth and advertising figures. They come from the club's own accounts.
- mudstack engagement and support metrics. They are internal to the employer; don't cite them without a public source or the employer's consent.
- Employment titles and dates (offer letters, HR records).

---

## Do not claim

- **CVE-2026-84375 (GHSA-2883-xcg3-v3hh) or GHSA-r3ph-w7gj-g6xm.** Neither advisory has a credits section, so nothing ties him to them.
- **Finder on CVE-2026-53550.** He is a credited Analyst; another researcher reported it.
- **"Snyk HIGH" on CVE-2026-59868.** GitHub rates it Moderate, and no Snyk credit was found.
- **Any model result from js-yaml-dos-eval.** None has been published.
- **Authorship of apple-foundation-models-py.** It is Ben Tucker's project on PyPI; his account holds a fork with 16 of his commits against Ben Tucker's 69. Say "contributor" only after an upstream merge is confirmed.
- **Forks as his work:** arxiv-auth, obsidian-minimal, and the Zed extensions fork. A Zed theme of his counts only once the upstream merge is checked.
- **kintsugi or macprobe as public projects.** No public repositories by those names exist.
- **Sales, revenue, installs or users** for the skills store or any tool.
- **"Founded" Clear as Mud.** Say "produced and hosted" (see D1).
- **"About 60 researchers annually"** or a San Jose State site for the ERP Boot Camp (see R2).
- **"Acknowledged in Scientific Reports 12:2076"** (see R4).
- **ERPLAB contributor** until a public record (release notes, commit, acknowledgement) names him. His site marks it self-reported.
- **Any title he didn't hold.** Check every template header and footer before sending.
