---
title: OpenToWork LinkedIn post
date: 2026-10-30
type: outreach-draft
status: ready for your edit
tags: [job-search, linkedin]
---

# OpenToWork LinkedIn post (draft)

```text
I'm looking for my next role in AI security research, red teaming, or security-focused technical writing. Remote works, as do hybrid and on-site roles in the Research Triangle.

This year I found two denial-of-service bugs in js-yaml. GitHub's advisories credit me as Finder on CVE-2026-59869 (High, 7.5) and CVE-2026-59868 (Moderate, 5.3), and as an Analyst, alongside five other researchers, on CVE-2026-53550.

Most of what I build is about keeping AI-assisted work honest about itself. Stratum, an append-only ledger, stores evidence such as file hashes and test exits apart from claims, so model output doesn't become authoritative just because it got saved.

"MAESTRO in Practice" is my field study of CSA's threat-modeling framework for agentic AI. It walks through twelve documented applications and checks the sourcing behind every headline number.

Secure Pride, the privacy-first cybersecurity nonprofit I run in Durham, serves under-resourced organizations. Before that I managed lab operations at the UC Davis Luck Lab and ran content and community at Mudstack, where I produced a podcast end to end.

The team I'm hoping to join tests AI systems adversarially and needs someone who can find the failure, then write it up so other people can act on it.

If you're hiring, or know someone who is, my DMs are open.

Essay: https://mazzeleczzare.com/blog/maestro-in-practice/
Stratum: https://stratum.mazzeleczzare.com/
GitHub: https://github.com/mazze93

#OpenToWork #AISecurity #RedTeaming
```

## Fact check

| Claim | Source | Result |
|---|---|---|
| Finder, CVE-2026-59869, High 7.5 | GitHub advisory GHSA-52cp-r559-cp3m, read 2026-10-30 | Matches (mazze93 is the only credit) |
| Finder, CVE-2026-59868, Moderate 5.3 | GHSA-g796-fgmg-93mv, read 2026-10-30 | Matches |
| Analyst with five others, CVE-2026-53550 | GHSA-h67p-54hq-rp68, read 2026-10-30 | Matches (reporter 0xbughunter, plus 5 analysts including mazze93) |
| Stratum keeps evidence apart from claims | mazzeleczzare.com Stratum description | Matches |
| MAESTRO essay covers twelve applications and checks the sourcing of headline figures | mazzeleczzare.com essay summary | Matches |
| Secure Pride, Luck Lab, Mudstack and podcast | Your own stated history, not checked against an outside source | Unverified externally |

## Editorial pass (prose-touchstone)

| Claim | Probe | Result |
|---|---|---|
| No em or en dashes | Character count | 0. Held |
| No "not X, but Y" or "isn't X, it's Y" lines | Regex for the negation shapes, tested first on a made-up example | 0. Held |
| No intensifiers or hype words | Word list (genuinely, passionate, excited, journey, leverage and similar) | 0. Held |
| No leftover three-item lists | Two-comma-plus-and regex. The first version missed one in the MAESTRO line, so the regex was widened and rerun | 4 → 1. The one left is the list of roles, which the post needs. Partial hold, accepted |
| Sentences don't keep starting with "I" | Count | 6 → 1. Held |

**Not checked:** how the post sounds read aloud, the order of the hashtags, and whether you'd rather lead with security engineering and DevRel (the two lanes you narrowed to on Oct 10) than with AI security research.

---
*Provenance: draft mode, built from verified advisory pages and live mazzeleczzare.com content on 2026-10-30. Career facts come from your own notes.*
