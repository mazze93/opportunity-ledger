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
- **Status:** one of three.
  - `verified-third-party`: a source he doesn't control confirms it (GitHub Advisory Database, Snyk, a publisher's byline).
  - `verified-artifact`: his own public repository, release or site shows the thing exists and does what the wording says. It proves the work exists, not how anyone rates it.
  - `unverified`: no public source confirms it. The reason is given. Don't use it until it moves up.
- **Roles:** SEC (Security Engineer), DEVREL (Developer Relations), WRITING (technical writing and content), RESEARCH (AI evals and safety research).

All statuses were checked on 2026-11-14 unless an entry says otherwise.

## Name note

The public credits use different forms of one identity. Say so if a reader might not connect them.

- GitHub advisories credit the account `mazze93`.
- Snyk credits "Mazze LeCzzare Frazer".
- One 2023 byline is under a previous surname (see W1).

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
- **Status:** `verified-third-party`.
- **Roles:** SEC, RESEARCH.

### S2. Finder, CVE-2026-59868 (js-yaml 5.x, Moderate)

- **Claim:** He found the same class of bug in js-yaml 5.0.0 to 5.1.0, rated Moderate (CVSS 3.1 base 5.3) by GitHub.
- **Resume wording:** "Credited Finder, CVE-2026-59868 (GHSA-g796-fgmg-93mv): denial of service in js-yaml 5.x."
- **Evidence:**
  - [GHSA-g796-fgmg-93mv](https://github.com/advisories/GHSA-g796-fgmg-93mv) (credits: `mazze93`, Finder)
- **Date:** 2026.
- **Status:** `verified-third-party` for the GitHub credit and the Moderate rating.
  - Unverified: a Snyk credit for this CVE. No Snyk advisory page naming him was found.
  - Snyk's [js-yaml 5.1.0 package page](https://security.snyk.io/package/npm/js-yaml/5.1.0) rates a 5.x merge-key issue high, but that page carries no credit. Say "Moderate" or give no severity.
- **Roles:** SEC, RESEARCH.

### S3. Analyst, CVE-2026-53550 (js-yaml, Moderate)

- **Claim:** He is one of five credited analysts on a repeated-alias merge-key denial of service that another researcher reported.
- **Resume wording:** "Credited Analyst (one of five), CVE-2026-53550 (GHSA-h67p-54hq-rp68)."
- **Evidence:** [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) (Reporter: another researcher; Analysts include `mazze93`).
- **Status:** `verified-third-party`.
- **Roles:** SEC.

### S4. Public coordinated-disclosure policy (Secure Pride)

- **Claim:** Secure Pride publishes a security.txt that points to a public disclosure policy, and its site describes a threat model and an AI safety scanner released under Apache 2.0.
- **Resume wording:** "Founded Secure Pride; published its coordinated vulnerability disclosure policy and security.txt."
- **Evidence:**
  - [securepride.org](https://securepride.org)
  - [security.txt](https://securepride.org/.well-known/security.txt)
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
- **Status:** `verified-artifact`.
- **Do not say:** that any model was evaluated, or any score. The README says it makes no claim about model performance.
- **Roles:** RESEARCH, SEC.

### E2. Prompt-injection detection gate and adversary runner

- **Claim:** He wrote a prompt-injection detection gate (aletheia) and an adversary runner to test it (apatea). Both have CI.
- **Resume wording:** "Built a prompt-injection detection gate and a companion adversarial test runner, both with CI."
- **Evidence:**
  - [mazze93/aletheia](https://github.com/mazze93/aletheia)
  - [mazze93/apatea](https://github.com/mazze93/apatea)
- **Status:** `verified-artifact`. No detection rates are claimed.
- **Roles:** RESEARCH, SEC.

### E3. MAESTRO in Practice

- **Claim:** He wrote a 42-page report applying the MAESTRO agentic-AI threat-modelling framework to 12 case studies, conducted in June 2026.
- **Resume wording:** "Author, MAESTRO in Practice: a 42-page applied threat-modelling study of 12 agentic-AI case studies (self-published, 2026)."
- **Evidence:** [mazzeleczzare.com/blog/maestro-in-practice](https://mazzeleczzare.com/blog/maestro-in-practice/).
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
- **Status:** `verified-artifact`.
- **Roles:** SEC, RESEARCH.

### T4. Claude Code skills marketplace

- **Claim:** He wrote and publishes a Claude Code plugin marketplace with 6 plugins and 30 skills. It installs in one command and has a live storefront.
- **Resume wording:** "Author of a Claude Code plugin marketplace: 6 plugins, 30 skills, one-command install, public storefront."
- **Evidence:**
  - [mazze93/claude-code-skills](https://github.com/mazze93/claude-code-skills) (all commits his)
  - [store.mazzeleczzare.com](https://store.mazzeleczzare.com)
  - Install: `/plugin marketplace add mazze93/claude-code-skills`
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
- **Status:** `verified-artifact`.
- **Roles:** DEVREL.

---

## 4. DevRel, content and community

### D1. Clear as Mud podcast (mudstack)

- **Claim:** mudstack ran a podcast called Clear as Mud from late 2022 into 2023, while he worked there.
- **Resume wording until his role is verified:** "Produced content for mudstack's Clear as Mud podcast." Use "hosted" or an episode count only after a public source names him.
- **Evidence:**
  - [Spotify: Clear as Mud](https://open.spotify.com/show/50eMqYFskikUzz4EuoYTyf) ("from the folks at mudstack"; episodes seen November 2022 to August 2023)
  - [SoundSage listing](https://soundsage.app/podcast/x2RoJLAx/clear-as-mud/) (37 episodes in all)
- **Status:**
  - `verified-third-party` that the show exists.
  - Unverified: his host or producer role and the "27 episodes" figure. No public page names a host.
  - Fix: an episode page or recording where he introduces himself.
- **Roles:** DEVREL, WRITING.

### D2. mudstack articles on 80.lv (team byline)

- **Claim:** 80.lv ran mudstack company pieces in 2023 under the byline "The mudstack team".
- **Resume wording:** "Contributed to mudstack's 80.lv features (team byline)." Don't claim sole authorship.
- **Evidence:**
  - [VR Vision feature, 2023-09-15](https://80.lv/articles/unveiling-the-vr-vision-team-s-journey-crafting-virtual-worlds-and-future-innovations)
  - [Pricing announcement, 2023-06-12](https://80.lv/articles/mudstack-goes-free-for-artists-simplifies-pricing-introduces-new-team-plan)
  - [Rapid-iteration piece, 2023-11-10](https://80.lv/articles/3-tips-on-rapid-iteration-for-digital-art-teams-launch-your-game-faster)
  - [Author page](https://80.lv/author/the-mudstack-team)
- **Status:**
  - `verified-third-party` that the pieces exist.
  - Unverified: which of them he wrote.
- **Roles:** DEVREL, WRITING.

### D3. mudstack livestream with HaZ Dulull (May 2023)

- **Claim:** mudstack ran a livestream with filmmaker HaZ Dulull on 2023-05-26.
- **Status:** unverified. The only evidence seen was a tweet mirror, and his role wasn't stated. Don't use it until there is a direct link that shows his part.
- **Roles:** DEVREL.

---

## 5. Research background

### R1. Research lab operations, UC Davis (2018 to 2022)

- **Claim:** He worked in research operations in UC Davis psychology labs (the Luck Lab, then the Bliss-Moreau Lab) from 2018 to 2022.
- **Resume wording:** "Research lab operations, UC Davis Department of Psychology (Luck Lab; Bliss-Moreau Lab), 2018 to 2022." Keep titles and month ranges in line with the resume-gap notes before using them.
- **Evidence:** [mazzeleczzare.com/work/research-program-operations](https://mazzeleczzare.com/work/research-program-operations/) (self-published).
- **Status:** unverified by any third party. No lab or university page names him.
  - Titles and dates differ between his resumes. Settle one version from offer letters or HR records first.
- **Roles:** RESEARCH.

### R2. ERP Boot Camp support

- **Claim:** The Luck Lab runs the ERP Boot Camp, a 10-day training funded by NIH grant R25MH080794. He says he helped run it.
- **Resume wording:** "Supported logistics for the NIH-funded ERP Boot Camp (10-day intensive training in EEG/ERP methods)."
- **Evidence:**
  - [erpinfo.org: ERP Boot Camp](https://erpinfo.org/the-erp-boot-camp)
  - [erpinfo.org: application info](https://erpinfo.org/application-info) (about 30 participants accepted)
  - [Luck Lab](https://lucklab.ucdavis.edu/)
- **Status:**
  - `verified-third-party` that the Boot Camp, its funding and its size exist.
  - Unverified: his role.
- **Do not say:** "about 60 researchers annually". The public figure is about 30 (the Luck Lab page says 35).
- **Roles:** RESEARCH, DEVREL.

### R3. Degree

- **Claim:** B.S. in Quantitative Psychology with a neuroscience emphasis, UC Davis, 2020.
- **Resume wording:** "B.S., Quantitative Psychology (neuroscience emphasis), University of California, Davis, 2020." Keep this exact form. Don't write "Quantitative Psychology and Neuroscience", which reads as two majors.
- **Status:** unverified publicly; degrees are normally confirmed by background check. Regents Scholar likewise.
- **Roles:** all.

---

## 6. Writing

### W1. "Networking at GDC 2023" (80.lv, bylined)

- **Claim:** He wrote an 80.lv article on networking at GDC 2023, bylined to him under a previous surname as a content writer at mudstack.
- **Resume wording:** "'Networking at GDC 2023: Tips for Artists, Game Developers, and Industry Leaders,' 80.lv, March 2023 (bylined under a previous surname)."
- **Evidence:** [80.lv article, 2023-03-15](https://80.lv/articles/networking-at-gdc-2023-tips-for-artists-game-developers-and-industry-leaders).
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
- **"Hosted 27 episodes" or "seven webinars"** until a public page names him.
- **"About 60 researchers annually"** for the ERP Boot Camp.
- **Any title he didn't hold.** Check every template header and footer before sending.
