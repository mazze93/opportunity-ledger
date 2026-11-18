// ============================================================
// grant.ts — the one yes, as a single-use grant.
//
// Implements the local half of docs/architecture.md "External action
// contract": the human's yes is recorded as an ApprovalGrant bound to
// an immutable draft digest (target + submit-file hashes + screening
// answers), an expiry and a single-use nonce.
//
//   issue   after the yes        stage gated    → granted
//   check   before every fill    refuses on any drift, expiry or reuse
//   arm     right before Submit  stage granted  → submitting (O_EXCL marker)
//   confirm after the employer's confirmation   → submitted (nonce consumed)
//   disarm  after a restart, once you have SEEN that nothing went in
//
// The armed marker is the retry guard: a session that restarts after
// clicking Submit finds it and must look for the confirmation before
// it may click again. A retry never re-submits blind.
//
// NOT implemented (stated, not claimed): a MAC over the grant or a
// verified approver identity. The approval is the recorded chat
// message; anyone with write access to the records dir could forge
// one. That is acceptable for one person's private records and is
// the reason the records dir must stay private.
// ============================================================
import { closeSync, existsSync, openSync, rmSync, writeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { canonicalJson, sha256 } from '../../src/canonical.ts';
import { driftedFiles } from './copies.ts';
import { advance, GATES, type Approval, type ApplicationRecord } from './record.ts';

const DAY_MS = 86_400_000;
export const DEFAULT_TTL_DAYS = 14;

const armedPath = (recDir: string) => join(recDir, 'submit.armed');
const consumedPath = (recDir: string, nonce: string) => join(recDir, `nonce.${nonce}.consumed`);

/** Digest of everything the yes covers. Any change to these needs a new yes. */
export async function draftDigest(rec: ApplicationRecord): Promise<string> {
  const files = [...rec.files].sort((a, b) => a.name.localeCompare(b.name)).map(f => ({ name: f.name, sha256: f.sha256 }));
  return sha256(canonicalJson({
    action: 'application.submit',
    target: { provider: rec.posting.provider, opportunityId: rec.posting.opportunityId, url: rec.posting.url },
    subject: rec.slug,
    files,
    answers: rec.answers,
  }));
}

/** Everything that must be true before a yes can be asked for. Empty list = ready. */
export function readiness(rec: ApplicationRecord): string[] {
  const missing: string[] = [];
  if (rec.fit?.verdict !== 'apply') missing.push('fit verdict is not "apply"');
  if (rec.fit && !rec.fit.postingOpen) missing.push('posting not confirmed open');
  if (!rec.files.length) missing.push('no submit copies (run: apply copies)');
  for (const g of GATES) if (rec.gates[g]?.result !== 'pass') missing.push(`gate ${g} has not passed`);
  return missing;
}

export async function issueGrant(rec: ApplicationRecord, approval: Approval, ttlDays = DEFAULT_TTL_DAYS, now = new Date()): Promise<ApplicationRecord> {
  const missing = readiness(rec);
  if (missing.length) throw new Error(`not ready for a yes: ${missing.join('; ')}`);
  if (!approval.messageId || !approval.quote) throw new Error('record the approving message id and its exact words');
  rec.grant = {
    version: 1,
    draftSha256: await draftDigest(rec),
    action: 'application.submit',
    target: { provider: rec.posting.provider, opportunityId: rec.posting.opportunityId },
    subject: rec.slug,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlDays * DAY_MS).toISOString(),
    nonce: randomUUID(),
    approval,
  };
  return advance(rec, 'granted', `grant issued on message ${approval.messageId}`, now);
}

/** Throws with every reason the grant no longer covers what is on disk. */
export async function checkGrant(rec: ApplicationRecord, recDir: string, now = new Date()): Promise<void> {
  const g = rec.grant;
  if (!g) throw new Error('no grant: ask for the one yes first');
  const problems: string[] = [...readiness(rec)];
  if (now.getTime() > Date.parse(g.expiresAt)) problems.push(`grant expired ${g.expiresAt}`);
  if (existsSync(consumedPath(recDir, g.nonce))) problems.push('grant already used: this application was submitted');
  if (g.draftSha256 !== await draftDigest(rec)) problems.push('files or answers changed since the yes');
  const drifted = driftedFiles(recDir, rec.files);
  if (drifted.length) problems.push(`submit copies changed on disk: ${drifted.join(', ')}`);
  if (problems.length) throw new Error(`grant does not cover this submit (ask again): ${problems.join('; ')}`);
}

/** Atomically mark "Submit is about to be clicked". Refuses if a previous click is unaccounted for. */
export async function arm(rec: ApplicationRecord, recDir: string, now = new Date()): Promise<ApplicationRecord> {
  await checkGrant(rec, recDir, now);
  let fd: number;
  try { fd = openSync(armedPath(recDir), 'wx'); }
  catch {
    throw new Error('a Submit click is already on record with no confirmation. Look for the employer\'s confirmation '
      + '(page or email) first, then run "apply confirm" if it went in or "apply disarm" if you saw it did not');
  }
  writeSync(fd, `${rec.grant!.nonce}\n${now.toISOString()}\n`);
  closeSync(fd);
  rec.attempts.push({ at: now.toISOString(), step: 'armed', note: 'about to click Submit' });
  return advance(rec, 'submitting', 'armed for submit', now);
}

export function confirm(rec: ApplicationRecord, recDir: string, confirmation: string, now = new Date()): ApplicationRecord {
  if (!rec.grant) throw new Error('no grant on record');
  if (!existsSync(armedPath(recDir))) throw new Error('not armed: run "apply arm" before clicking Submit');
  if (!confirmation.trim()) throw new Error('record what confirmed it (page text, email subject, confirmation id)');
  const fd = openSync(consumedPath(recDir, rec.grant.nonce), 'wx'); // throws if already consumed
  writeSync(fd, `${now.toISOString()}\n${confirmation}\n`);
  closeSync(fd);
  rmSync(armedPath(recDir));
  rec.submission = { at: now.toISOString(), confirmation };
  return advance(rec, 'submitted', 'submitted; nonce consumed', now);
}

/** Only after SEEING that the earlier click did not go in (no confirmation page, no email). */
export function disarm(rec: ApplicationRecord, recDir: string, evidence: string, now = new Date()): ApplicationRecord {
  if (!existsSync(armedPath(recDir))) throw new Error('nothing armed');
  if (!evidence.trim()) throw new Error('say what showed the submit did not go in');
  rmSync(armedPath(recDir));
  rec.attempts.push({ at: now.toISOString(), step: 'disarmed', note: evidence });
  return advance(rec, 'granted', 'disarmed after a failed attempt', now);
}

/** The one message that asks for the one yes. Everything the yes covers, nothing else. */
export function askText(rec: ApplicationRecord): string {
  const answers = Object.entries(rec.answers).map(([k, v]) => `- ${k}: ${v}`);
  return [
    `Submit ${rec.title} at ${rec.company}?`,
    `Posting: ${rec.posting.url}`,
    `Files: ${rec.files.map(f => f.name).join(', ')}`,
    ...(answers.length ? ['Screening answers:', ...answers] : []),
    ...(rec.fit?.gaps.length ? [`Gaps you should be ready for: ${rec.fit.gaps.join('; ')}`] : []),
    'A yes covers filling the form, uploading these files and submitting.',
  ].join('\n');
}
