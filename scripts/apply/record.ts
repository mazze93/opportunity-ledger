// ============================================================
// record.ts — one application's private record: shape, load, save.
//
// A record lives at <APPLICATIONS_DIR>/<slug>/record.json. That
// directory holds personal data and must sit OUTSIDE this public
// repository; resolveDir() refuses a path inside it.
//
// Side effects: readRecord/writeRecord touch the filesystem.
// writeRecord is atomic (temp file + rename) so a session that dies
// mid-write never leaves a half-written record behind.
// ============================================================
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------- stages ----------
// candidate → drafting → gated → granted → submitting → submitted
// side exits: skipped (fit says no), handed-off (site refused us),
// then outcome stages once the employer answers.
export const STAGES = [
  'candidate', 'skipped', 'drafting', 'gated', 'granted', 'submitting',
  'submitted', 'handed-off', 'screen', 'interview', 'offer', 'rejected',
  'withdrawn', 'no-response',
] as const;
export type Stage = typeof STAGES[number];
export const OUTCOME_STAGES: readonly Stage[] = ['screen', 'interview', 'offer', 'rejected', 'withdrawn', 'no-response'];

export const GATES = ['touchstone', 'prose', 'facts'] as const;
export type GateName = typeof GATES[number];

// ---------- shape ----------
export interface Gate { result: 'pass' | 'fail'; note: string; at: string }
export interface SubmitFile { name: string; sha256: string; from: string }
export interface Approval { messageId: string; quote: string; at: string }

// Matches docs/architecture.md "External action contract".
export interface ApprovalGrant {
  version: 1;
  draftSha256: string;
  action: 'application.submit';
  target: { provider: string; opportunityId: string };
  subject: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
}

export interface ApplicationRecord {
  version: 1;
  slug: string;
  company: string;
  title: string;
  posting: { url: string; provider: string; opportunityId: string; canonicalSha256?: string };
  stage: Stage;
  fit: { verdict: 'apply' | 'skip' | 'hold'; reasons: string[]; gaps: string[]; postingOpen: boolean; at: string } | null;
  files: SubmitFile[];
  answers: Record<string, string>;
  gates: Partial<Record<GateName, Gate>>;
  grant: (ApprovalGrant & { approval: Approval }) | null;
  attempts: { at: string; step: string; note: string }[];
  submission: { at: string; confirmation: string } | null;
  outcome: { stage: Stage; at: string; note: string } | null;
  history: { at: string; event: string }[];
}

// ---------- paths ----------
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** Resolve the private records directory; refuse anything inside this public repo. */
export function resolveDir(dir: string | undefined): string {
  if (!dir) throw new Error('set APPLICATIONS_DIR (or --dir) to a private directory outside this repository');
  const abs = resolve(dir);
  const rel = relative(REPO_ROOT, abs);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)))
    throw new Error(`refusing ${abs}: application records hold personal data and must live outside the public repository`);
  return abs;
}

export function assertSlug(slug: string): string {
  if (!SLUG.test(slug)) throw new Error(`slug must be lowercase kebab-case: ${slug}`);
  return slug;
}

export const recordDir = (dir: string, slug: string) => join(dir, assertSlug(slug));
export const recordPath = (dir: string, slug: string) => join(recordDir(dir, slug), 'record.json');

// ---------- load / save ----------
export function readRecord(dir: string, slug: string): ApplicationRecord {
  const path = recordPath(dir, slug);
  if (!existsSync(path)) throw new Error(`no record for ${slug} (run: apply init)`);
  return validate(JSON.parse(readFileSync(path, 'utf8')) as ApplicationRecord);
}

export function writeRecord(dir: string, rec: ApplicationRecord): void {
  validate(rec);
  const path = recordPath(dir, rec.slug);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(rec, null, 2)}\n`);
  renameSync(tmp, path);
}

/** Append a dated history line and move the stage, in one place. */
export function advance(rec: ApplicationRecord, stage: Stage, event: string, now = new Date()): ApplicationRecord {
  rec.stage = stage;
  rec.history.push({ at: now.toISOString(), event });
  return rec;
}

/** Stage after a gate result: any re-gate after a yes drops back to gated so the old yes is re-checked. */
export function stageAfterGates(rec: ApplicationRecord): Stage {
  if (['granted', 'submitting', 'submitted'].includes(rec.stage)) return 'gated'; // any re-gate voids readiness for the old yes
  return GATES.every(g => rec.gates[g]?.result === 'pass') && rec.fit?.verdict === 'apply' ? 'gated' : rec.stage;
}

// ---------- validation (fail loudly on drift) ----------
function validate(rec: ApplicationRecord): ApplicationRecord {
  if (rec.version !== 1) throw new Error('record.version must be 1');
  assertSlug(rec.slug);
  for (const k of ['company', 'title'] as const)
    if (!rec[k]) throw new Error(`record.${k} is required`);
  if (!/^https:\/\//.test(rec.posting?.url ?? '')) throw new Error('record.posting.url must be https');
  if (!rec.posting.provider || !rec.posting.opportunityId) throw new Error('record.posting needs provider and opportunityId');
  if (!STAGES.includes(rec.stage)) throw new Error(`unknown stage ${rec.stage}`);
  for (const f of rec.files) if (/_v\d/i.test(f.name)) throw new Error(`submit file name carries a version: ${f.name}`);
  return rec;
}

export function newRecord(input: { slug: string; company: string; title: string; url: string; provider?: string; opportunityId?: string; canonicalSha256?: string }, now = new Date()): ApplicationRecord {
  const rec: ApplicationRecord = {
    version: 1,
    slug: assertSlug(input.slug),
    company: input.company,
    title: input.title,
    posting: {
      url: input.url,
      provider: input.provider ?? 'manual',
      opportunityId: input.opportunityId ?? input.url,
      ...(input.canonicalSha256 ? { canonicalSha256: input.canonicalSha256 } : {}),
    },
    stage: 'candidate',
    fit: null, files: [], answers: {}, gates: {}, grant: null,
    attempts: [], submission: null, outcome: null,
    history: [{ at: now.toISOString(), event: 'recorded as candidate' }],
  };
  return validate(rec);
}
