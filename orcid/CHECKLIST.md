---
title: ORCID record checklist
description: What to change on ORCID iD 0009-0005-9661-4780, section by section, with the proof for each entry. Read with works.bib and docs/scholarly-pipeline.md.
checked: 2026-11-14
tags: [career, orcid, proof-bank]
---

# ORCID record checklist

Record: [orcid.org/0009-0005-9661-4780](https://orcid.org/0009-0005-9661-4780). Every entry below traces to a public record in [[PROOF_BANK]] (proof-bank/PROOF_BANK.md on the `proof-bank` branch) or to mazzeleczzare.com, which is the source of truth. If an item isn't listed here, it doesn't go on ORCID.

## What the record holds now

Read from ORCID's public JSON on 2026-11-14.

| Section | Now |
|---|---|
| Name | Credit name Mazze LeCzzare; family name Frazer |
| Also known as | Mazze Frazer |
| Biography | Content strategist framing, written May 2026. No mention of the security research or shipped software |
| Keywords | 11, set 2026-05-23 |
| Websites | none |
| Emails | two, both public |
| Employment | Secure Pride (from 2025-03-27, no role); UC Davis, Junior Specialist, Center for Mind and Brain, Sep 2018 to Jun 2022 |
| Education | UC Davis, Psychology, "B.S. in Psychology (Quantitative)", 2018 to 2020 |
| Works | one: securepride.org (website) |
| Funding, peer review, research resources | empty |

## 1. Names

- [ ] **Also known as:** add `Mazze LeCzzare Frazer`. Snyk credits that form on CVE-2026-59869 (proof bank S1). Keep `Mazze Frazer`.
- [ ] The private checklist (kept outside this repository) holds one more name to consider, with its visibility setting.

## 2. Websites

ORCID: Websites & social links > Edit.

- [ ] `https://mazzeleczzare.com` (name it "Website")
- [ ] `https://mazzeleczzare.com/work/` ("Work and evidence")
- [ ] `https://research.mazzeleczzare.com` ("Research")
- [ ] `https://github.com/mazze93` ("GitHub")

## 3. Keywords (optional)

The 11 keywords stand. Three would match the record once the works below are in: `Vulnerability Research`, `AI Evaluation`, `Developer Relations`.

## 4. Employment

- [ ] **Secure Pride:** add the role `Founder`. No public page names him as founder yet (proof bank S4). Adding a founder line to securepride.org/about closes that gap.
- [ ] **UC Davis:** the current entry merges two jobs and puts the second job's title on the first. Replace it with two entries once the months are settled from offer letters or HR records (the resumes disagree; see the private gaps file):
  - Lab Manager Assistant, Luck Lab, Center for Mind and Brain. Proof: Luck Lab alumni page (proof bank R1).
  - Junior Specialist, Bliss-Moreau Lab. Proof: Luck Lab alumni page; Charbonneau dissertation acknowledgements, UC Davis 2024 (R1).
- [ ] **mudstack (add):** `Content and Community Manager`. Proof: mudstack's own blog bio (proof bank D4). His site gives October 2022 to November 2023; confirm the months from his records before entering. Add "Content Writer" to the description only if he wants the earlier title shown (his October 2022 post and the March 2023 80.lv byline use it).

## 5. Education and qualifications

Source for this section: his LinkedIn education section (screenshot, 2026-11-14) and his site.

- [ ] **UC Davis:** change the degree text to `B.S., Quantitative Psychology (neuroscience emphasis)`. Keep 2018 to 2020. He confirmed the degree is a B.S. (2026-11-14). LinkedIn shows "Bachelor of Applied Science - BASc", so LinkedIn may want the same fix.
- [ ] **Butte College (add):** Psychology, 2015 to 2018.

### Distinctions (ORCID: Distinctions > + Add)

| Distinction | Organization | Year |
|---|---|---|
| Regents Scholar | University of California, Davis | (year from his records) |
| Osher Reentry Scholarship | University of California, Davis | 2019 |
| Cal Aggie Alumni Association Leadership Scholarship | Cal Aggie Alumni Association, UC Davis | 2018 |
| Gerald Lewis Armour and Jane Billiou Armour Scholarship | University of California, Davis | 2018 |
| Phi Theta Kappa Honors Scholarship | Butte College | 2017 |
| EOPS Exceptional Contribution to Student Equity Award | Butte College | 2017 |

Regents Scholar is on his site ([Research Program Operations](https://mazzeleczzare.com/work/research-program-operations/)); the other five are on his LinkedIn education section, under the school shown.

## 6. Works

Three routes, so nothing is entered twice. ORCID groups duplicates only by DOI, ISBN or ISSN.

1. **Blog essays: automatic.** Rogue Scholar registers a Crossref DOI for each post in `mazzeleczzare.com/feed.json`, with his ORCID iD in the metadata. After the first one, ORCID sends an inbox notice asking him to let Crossref update the record. One yes covers every later essay. Don't import essays by hand.
2. **Software releases: automatic, once Zenodo is on.** See section 8.
3. **Everything else: `works.bib`.** Import it once (Works > + Add > Add BibTeX):
   - CVE-2026-59869, Finder (GHSA-52cp-r559-cp3m)
   - CVE-2026-59868, Finder (GHSA-g796-fgmg-93mv)
   - CVE-2026-53550, Analyst (GHSA-h67p-54hq-rp68)
   - Intentional Fragility: Accountable Forgetting in Local-First AI (paper PDF on his site)
   - mudstack 2023 roadmap webinar, host (2022-12-06)

   Then check each imported work's type: CVEs as Other, the paper as Report or Preprint, the webinar as Lecture or speech.

Add by hand, once the date is checked: the **Pitch to Publisher** webinar, where he says "I'll be your host" ([YouTube](https://www.youtube.com/watch?v=rdsgB1Uoi-Q), proof bank D3). Its upload date couldn't be read from here.

### Not ORCID works

These stay on his site and in the proof bank as evidence, not as works:

- The Charbonneau dissertation and the Luck Lab page thank or list him; neither is his authored work.
- Clear as Mud: he hosted the show and booked its guests. Put it in the mudstack employment description now. Each episode he hosted can go on ORCID as a work once its title and date are listed.
- Dodgson & Raymond 2022 (Scientific Reports): the paper doesn't name him (proof bank R4).
- The 80.lv team-byline pieces (D2): which ones he wrote isn't shown.

## 7. Biography (optional)

The May 2026 biography leads with content strategy. A version that names the CVE credits, the shipped tools and the research site would match the record. Draft it in his own words; nothing here writes it for him.

## 8. Software DOIs through Zenodo

Zenodo archives a GitHub release and gives it a DataCite DOI. With DataCite auto-update on, every DOI that lists his ORCID iD appears on his ORCID record by itself.

Repositories with a release, so ready once Zenodo is on:

| Repository | Latest release | Note |
|---|---|---|
| github-mcp-gateway | v1.1.0 | |
| stratum | v0.5.0 | |
| stele | v1.2.0 | |
| adaptive-response | v1.0.0 | |
| github-hardening-skills | v1.0.0 | |
| distinctive-frontend-design | v1.0.0 | |
| secure-container-template | v0.1.0 | |
| ai-behavior-research | v0.1.0-rc.1 | pre-release |

No release yet, so they need a first release before Zenodo can archive them: js-yaml-dos-eval, aletheia, apatea, claude-code-skills.

Steps, all his to take:

1. Sign in to [zenodo.org](https://zenodo.org) and connect GitHub (profile menu > GitHub).
2. Click **Sync now**, then flip the switch beside each repository to archive.
3. Add a `CITATION.cff` to each repository that names him as author with `orcid: "https://orcid.org/0009-0005-9661-4780"` and sets `url:` to the project's page on mazzeleczzare.com, so the DOI record points back to the site. (A `.zenodo.json` overrides `CITATION.cff` if both exist.)
4. Publish a new release. Zenodo's docs say it archives new releases; nothing there says it picks up older ones, so expect a patch release per repository.
5. Once, at [DataCite Commons](https://commons.datacite.org): sign in with ORCID, authorise DataCite, and click **Enable** beside ORCID Auto-Update.

If he skips Zenodo, `software.bib` adds the three headline releases by hand instead.

## Gaps: verified work with no page on his site

His site is the source of truth, so each of these should get a page or a line there:

- The three CVE credits have no page of their own; /work/ lists them in one entry. A per-advisory page, or anchors on /work/, would give ORCID and resumes a site link.
- The four mudstack webinars he hosted (proof bank D3) aren't on the site.
- Two standalone essays, The Architecture of Forgetting and What We Don't Know Yet, are static pages outside the blog collection, so they aren't in the scholarly feed and won't get Rogue Scholar DOIs. Moving them into the blog collection, or giving them Zenodo DOIs, fixes that.
- Where the site disagrees with the outside record (the Luck Lab title, the banknote paper, the degree wording on /work/), the proof bank lists each one. Fix the site before a DOI freezes a claim.
