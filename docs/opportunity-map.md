# Opportunity map

This is the first search map, not a claim that these are the only relevant employers. Each board is an exact public ATS identifier, and each candidate remains traceable to a raw feed snapshot and posting URL.

| Board | Track | Initial result (checked 2026-09-27) |
|---|---|---|
| `semgrep` | security research | Senior/Staff Security Researcher, Remote US |
| `afterquery` | technical content | Technical Content Writer (Contract), US Remote |
| `Theori` | vulnerability research | AppSec Engineer, US/Canada Remote |
| `socure` | security/content watch | No candidate under the strict remote policy at the initial check; retained for future openings |

The policy requires an explicit US remote signal and a title match for security research, application security, technical writing, content, developer education, or product marketing. Hybrid roles are rejected even when another field says remote. A posting's old publication date affects rank, not eligibility, while the provider still lists it. Human review should confirm scope, seniority, pay, and application requirements.

## MCP surface

The remote endpoint is `/mcp`, guarded by `Authorization: Bearer <LEDGER_TOKEN>` on every request. Its tool registry is deliberately small:

| Tool | Result | Side effect |
|---|---|---|
| `list_targets` | Curated boards and policy identity | None |
| `list_opportunities` | Up to 100 candidates, score explanations, direct links, SHA-256 digests, R2 pointers, fetch times | None |

The agent can map a candidate to evidence and draft a response. It cannot choose fetch URLs, modify the source registry, change eligibility/score, retrieve the raw untrusted description through MCP, send a message, or submit an application. Ingestion uses the separate authenticated `POST /runs` route or the daily schedule. The GitHub gateway's OAuth login, GitHub App, and KV credentials are **not reused**; adding comparable OAuth for the ledger is a separate deployment task.
