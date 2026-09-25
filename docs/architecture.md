# Architecture and review contract

## Boundaries

```text
Curated targets → Fixed provider adapter → Raw R2 snapshot
                                            ↓
                                   Canonical projection
                                            ↓
                                   Hard predicates → Score
                                            ↓
                               D1 observations/evaluations
                                            ↓
                                   Read-only agent/API
```

`agent-harness` can provide portable process discipline. `temenos` can inspect untrusted job text before LLM use. `praxis-aegis` may eventually enforce consequential action approval. None is a runtime dependency in this repository.

## Invariants

| ID | Claim and enforcement |
|---|---|
| INV-01 | Source records enter through three named public ATS adapters. The caller cannot supply a fetch URL. |
| INV-02 | Eligibility comes only from `evaluate()` and a validated policy. Unknown is represented explicitly. |
| INV-03 | Ranking is a pure function of canonical record, immutable policy content, and evaluation clock. Feature contributions carry evidence. |
| INV-04 | Each observation points to a content-addressed exact response and a JSON pointer. A read checks the digest before processing. |
| INV-05 | Raw, canonical, policy, schema, normalizer, and engine identities are separately stored. |
| INV-06 | Provider prose is data with no instruction authority. Text cleanup is for display/normalization, not prompt injection prevention. |
| INV-07 | No action route is shipped. Future mutation authorization must bind action, target, subject, exact draft hash, expiry, and single-use nonce. |
| INV-08 | R2 writes use digest keys and D1 rows use derived IDs with upsert/ignore semantics so workflow replay does not duplicate observations or evaluations. |
| INV-09 | A score without feature evidence is invalid; rejected/unknown records have no score. |

## Data model

- `opportunities`: current title, URL, and first/last sighting for `(provider, source_id)`.
- `observations`: exact raw feed digest and R2 key, JSON pointer, normalized posting digest, normalizer/schema version, fetch metadata.
- `evaluations`: observation and policy digests, engine version, disposition, score, predicates, contributions, evaluation clock.

The response is hashed **before** JSON parsing. The canonical record is validated and serialized with sorted keys under JCS rules for JSON-compatible values. The raw hash changes when any byte in a board response changes, including a different posting; the canonical hash isolates the interpreted posting. R2 storage is not append-only against bucket administrators, and D1 is not an immutable audit log. These hashes detect accidental drift and support independent verification when snapshots are retained.

## Failure behavior

- Redirect, non-JSON content type, oversized body, invalid UTF-8/JSON, provider schema drift, missing R2 object, or digest mismatch fails the workflow step.
- A malformed posting fails its page. Previously completed pages remain persisted; the workflow status signals failure. The service does not infer a board's completeness or close absent roles.
- Repeated requests can create separate workflow instances; D1 observation and evaluation identities de-duplicate the persisted data. `last_seen_at` advances for repeated sightings.
- A policy change creates a new policy hash. Existing rows do not silently change, and this release does not include historical re-evaluation.

## External action contract (future, no current endpoint)

```ts
interface ApprovalGrant {
  version: 1;
  draftSha256: string;
  action: 'application.submit' | 'message.send';
  target: { provider: string; opportunityId: string };
  subject: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
}
```

A future action executor must verify the signature/MAC and trusted approver identity, compare every bound field to the exact immutable draft, atomically consume the nonce with an idempotency key, and handle retries without repeating provider mutations. This is a design requirement, not an implemented or claimed safety property.
