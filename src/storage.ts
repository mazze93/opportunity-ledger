import type { D1Database } from '@cloudflare/workers-types';
import { canonicalJson, sha256 } from './canonical';
import { Canonical, Evaluation, Policy, Snapshot } from './contracts';
import { ENGINE_VERSION } from './policy';

export async function policyIdentity(policy: Policy): Promise<string> {
  return sha256(canonicalJson(Policy.parse(policy)));
}

export async function persist(db: D1Database, record: Canonical, snapshot: Snapshot,
  pointer: string, evaluation: Evaluation, policy: Policy): Promise<void> {
  const c = Canonical.parse(record), p = Policy.parse(policy);
  const canonicalSha = await sha256(canonicalJson(c));
  const policySha = await policyIdentity(p);
  const opportunityId = `urn:opportunity:sha256:${await sha256(canonicalJson([c.provider, c.sourceId]))}`;
  const observationId = `urn:observation:sha256:${await sha256(canonicalJson([
    opportunityId, snapshot.rawSha256, canonicalSha, '1'
  ]))}`;
  const evaluationId = `urn:evaluation:sha256:${await sha256(canonicalJson([
    observationId, policySha, ENGINE_VERSION
  ]))}`;
  await db.batch([
    db.prepare(`INSERT INTO opportunities
      (id,provider,source_id,company,title,location_mode,canonical_url,first_seen_at,last_seen_at)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      company=excluded.company,title=excluded.title,location_mode=excluded.location_mode,
      canonical_url=excluded.canonical_url,
      last_seen_at=max(opportunities.last_seen_at, excluded.last_seen_at)`)
      .bind(opportunityId,c.provider,c.sourceId,c.company,c.title,c.locationMode,c.canonicalUrl,
        snapshot.fetchedAt,snapshot.fetchedAt),
    db.prepare(`INSERT OR IGNORE INTO observations
      (id,opportunity_id,raw_sha256,canonical_sha256,raw_payload_ref,raw_json_pointer,
       source_url,schema_version,normalizer_version,fetched_at,http_status,etag,last_modified)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(observationId,opportunityId,snapshot.rawSha256,canonicalSha,snapshot.payloadRef,pointer,
        snapshot.sourceUrl,'1','1',snapshot.fetchedAt,snapshot.httpStatus,snapshot.etag,snapshot.lastModified),
    db.prepare(`INSERT OR IGNORE INTO evaluations
      (id,observation_id,policy_id,policy_version,policy_sha256,engine_version,
       disposition,score,explanation_json,evaluated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(evaluationId,observationId,p.id,p.version,policySha,ENGINE_VERSION,
        evaluation.disposition,evaluation.score,canonicalJson(evaluation),snapshot.fetchedAt)
  ]);
}
