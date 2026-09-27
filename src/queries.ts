import { policyIdentity } from './storage';
import { ENGINE_VERSION } from './policy';
import { Policy } from './contracts';

export async function listCandidates(db: D1Database, policy: Policy, limit = 30) {
  const policySha = await policyIdentity(policy);
  const rows = await db.prepare(`SELECT o.id,o.company,o.title,o.location_mode,o.canonical_url,
    o.last_seen_at,e.disposition,e.score,e.explanation_json,b.raw_sha256,b.canonical_sha256,
    b.raw_payload_ref,b.raw_json_pointer,b.source_url,b.fetched_at,e.policy_sha256
    FROM opportunities o
    JOIN observations b ON b.opportunity_id=o.id
    JOIN evaluations e ON e.observation_id=b.id
    WHERE b.id=(SELECT b2.id FROM observations b2 WHERE b2.opportunity_id=o.id
      ORDER BY b2.fetched_at DESC,b2.id DESC LIMIT 1)
    AND e.policy_sha256=? AND e.engine_version=? AND e.disposition='candidate'
    ORDER BY e.score DESC,o.id LIMIT ?`).bind(policySha, ENGINE_VERSION, limit).all();
  return rows.results;
}
