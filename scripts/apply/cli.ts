// ============================================================
// cli.ts — `npm run apply -- <command>`: one application, posting to outcome.
//
// Records live in APPLICATIONS_DIR (or --dir), a PRIVATE directory
// outside this repository. See docs/application-loop.md.
//
//   init     <slug> --company --title --url [--provider --opportunity-id --canonical-sha256]
//   fit      <slug> --verdict apply|skip|hold --open yes|no --reason .. [--reason ..] [--gap ..]
//   answers  <slug> --file answers.json        screening answers (replaces; needs a new yes)
//   copies   <slug> <file>[=UploadName.ext] .. plain-named submit copies + SOURCE.md
//   prose    <slug> <application.json>         prose probes → records the prose gate
//   gate     <slug> touchstone|facts|prose pass|fail --note ..
//   ready    <slug>                            what is missing, or the text of the one ask
//   grant    <slug> --message <id> --quote ".." [--ttl-days 14]
//   check    <slug>                            does the grant still cover what is on disk
//   plan     <slug> [--profile profile.json]   every form value + file path, in one block
//   note     <slug> --step .. --note ..        log an attempt step (survives restarts)
//   arm      <slug>                            immediately before clicking Submit
//   confirm  <slug> --evidence ..              after the employer confirms receipt
//   disarm   <slug> --evidence ..              after SEEING an armed submit did not go in
//   handoff  <slug> --note ..                  the site refused us; files are ready for him
//   outcome  <slug> <stage> --note ..          screen|interview|offer|rejected|withdrawn|no-response
//   status                                     one line per application
// ============================================================
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { makeSubmitCopies } from './copies.ts';
import { arm, askText, checkGrant, confirm, disarm, issueGrant, readiness } from './grant.ts';
import { scan, selfTest } from './prose.ts';
import {
  advance, GATES, newRecord, OUTCOME_STAGES, readRecord, recordDir, resolveDir, stageAfterGates, writeRecord,
  type ApplicationRecord, type GateName, type Stage,
} from './record.ts';

const { values: opt, positionals: pos } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string' }, company: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' },
    provider: { type: 'string' }, 'opportunity-id': { type: 'string' }, 'canonical-sha256': { type: 'string' },
    verdict: { type: 'string' }, open: { type: 'string' }, reason: { type: 'string', multiple: true },
    gap: { type: 'string', multiple: true }, file: { type: 'string' }, note: { type: 'string' },
    message: { type: 'string' }, quote: { type: 'string' }, 'ttl-days': { type: 'string' },
    profile: { type: 'string' }, step: { type: 'string' }, evidence: { type: 'string' },
  },
});

const [cmd, slug, ...rest] = pos;
const now = new Date();
const need = (v: string | undefined, name: string): string => {
  if (!v) throw new Error(`missing ${name}`);
  return v;
};

// ---------- record helpers ----------
const dir = () => resolveDir(opt.dir ?? process.env.APPLICATIONS_DIR);
const load = () => readRecord(dir(), need(slug, '<slug>'));
const save = (rec: ApplicationRecord, line: string) => { writeRecord(dir(), rec); console.log(`${rec.slug}: ${line} [${rec.stage}]`); };

// ---------- commands ----------
const commands: Record<string, () => Promise<void> | void> = {
  init() {
    const s = need(slug, '<slug>');
    if (existsSync(join(dir(), s, 'record.json'))) throw new Error(`${s} already has a record`);
    save(newRecord({
      slug: s, company: need(opt.company, '--company'), title: need(opt.title, '--title'), url: need(opt.url, '--url'),
      provider: opt.provider, opportunityId: opt['opportunity-id'], canonicalSha256: opt['canonical-sha256'],
    }, now), 'recorded');
  },

  fit() {
    const rec = load();
    const verdict = need(opt.verdict, '--verdict');
    if (!['apply', 'skip', 'hold'].includes(verdict)) throw new Error('--verdict is apply, skip or hold');
    const reasons = opt.reason ?? [];
    if (!reasons.length) throw new Error('give at least one --reason');
    rec.fit = { verdict: verdict as 'apply' | 'skip' | 'hold', reasons, gaps: opt.gap ?? [], postingOpen: opt.open === 'yes', at: now.toISOString() };
    const stage: Stage = verdict === 'skip' ? 'skipped' : verdict === 'apply' ? 'drafting' : 'candidate';
    save(advance(rec, stage, `fit: ${verdict}`, now), `fit ${verdict}`);
  },

  answers() {
    const rec = load();
    const parsed = JSON.parse(readFileSync(need(opt.file, '--file'), 'utf8')) as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) if (typeof v !== 'string') throw new Error(`answer ${k} must be a string`);
    rec.answers = parsed as Record<string, string>;
    save(advance(rec, rec.grant ? 'gated' : rec.stage, 'screening answers set', now), `${Object.keys(parsed).length} answers`);
  },

  copies() {
    const rec = load();
    rec.files = makeSubmitCopies(recordDir(dir(), rec.slug), rest);
    for (const f of rec.files) console.log(`  ${f.name}  ${f.sha256.slice(0, 12)}  ← ${f.from}`);
    save(advance(rec, rec.grant ? 'gated' : rec.stage, `submit copies: ${rec.files.map(f => f.name).join(', ')}`, now), 'copies written');
  },

  prose() {
    const rec = load();
    const blind = selfTest();
    if (blind.length) throw new Error(`prose probes are blind: ${blind.join(' | ')}`);
    const hits = scan(JSON.parse(readFileSync(need(rest[0], '<application.json>'), 'utf8')));
    for (const h of hits) console.log(`${h.accepted ? 'accepted' : 'FLAG    '} ${h.where} ${h.probe}: ${h.text}`);
    const open = hits.filter(h => !h.accepted);
    const result = open.length ? 'fail' : 'pass';
    rec.gates.prose = { result, note: `${hits.length} hits, ${open.length} unaccepted`, at: now.toISOString() };
    save(advance(rec, stageAfterGates(rec), `prose gate ${result}`, now), `prose ${result}`);
    if (open.length) process.exitCode = 1;
  },

  gate() {
    const rec = load();
    const [name, result] = rest;
    if (!GATES.includes(name as GateName)) throw new Error(`gate is one of ${GATES.join(', ')}`);
    if (result !== 'pass' && result !== 'fail') throw new Error('result is pass or fail');
    rec.gates[name as GateName] = { result, note: need(opt.note, '--note'), at: now.toISOString() };
    save(advance(rec, stageAfterGates(rec), `${name} gate ${result}`, now), `${name} ${result}`);
  },

  ready() {
    const rec = load();
    const missing = readiness(rec);
    if (missing.length) { missing.forEach(m => console.log(`missing: ${m}`)); process.exitCode = 1; return; }
    console.log(askText(rec));
  },

  async grant() {
    const rec = load();
    const ttl = opt['ttl-days'] ? Number(opt['ttl-days']) : undefined;
    await issueGrant(rec, { messageId: need(opt.message, '--message'), quote: need(opt.quote, '--quote'), at: now.toISOString() }, ttl, now);
    save(rec, `granted until ${rec.grant!.expiresAt}`);
  },

  async check() {
    const rec = load();
    await checkGrant(rec, recordDir(dir(), rec.slug), now);
    console.log(`${rec.slug}: grant covers what is on disk (expires ${rec.grant!.expiresAt})`);
  },

  async plan() {
    const rec = load();
    const recDir = recordDir(dir(), rec.slug);
    await checkGrant(rec, recDir, now);
    const profilePath = opt.profile ?? process.env.APPLICANT_PROFILE ?? join(dir(), 'profile.json');
    const profile = JSON.parse(readFileSync(profilePath, 'utf8')) as { fields?: Record<string, string> };
    console.log(JSON.stringify({
      url: rec.posting.url,
      fields: { ...(profile.fields ?? {}), ...rec.answers },
      files: rec.files.map(f => join(recDir, 'submit', f.name)),
      attempts: rec.attempts,
    }, null, 2));
  },

  note() {
    const rec = load();
    rec.attempts.push({ at: now.toISOString(), step: need(opt.step, '--step'), note: opt.note ?? '' });
    save(rec, `step ${opt.step}`);
  },

  async arm() {
    const rec = load();
    save(await arm(rec, recordDir(dir(), rec.slug), now), 'armed: click Submit now');
  },

  confirm() {
    const rec = load();
    save(confirm(rec, recordDir(dir(), rec.slug), need(opt.evidence, '--evidence'), now), 'submitted');
  },

  disarm() {
    const rec = load();
    save(disarm(rec, recordDir(dir(), rec.slug), need(opt.evidence, '--evidence'), now), 'disarmed');
  },

  handoff() {
    const rec = load();
    if (!rec.files.length) throw new Error('make the submit copies before handing off');
    rec.attempts.push({ at: now.toISOString(), step: 'handed-off', note: need(opt.note, '--note') });
    save(advance(rec, 'handed-off', `handed off: ${opt.note}`, now), 'handed off');
  },

  outcome() {
    const rec = load();
    const stage = need(rest[0], '<stage>') as Stage;
    if (!OUTCOME_STAGES.includes(stage)) throw new Error(`outcome is one of ${OUTCOME_STAGES.join(', ')}`);
    rec.outcome = { stage, at: now.toISOString(), note: need(opt.note, '--note') };
    save(advance(rec, stage, `outcome: ${stage}`, now), `outcome ${stage}`);
  },

  status() {
    const root = dir();
    if (!existsSync(root)) { console.log('no records yet'); return; }
    const slugs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(join(root, d.name, 'record.json')));
    for (const d of slugs) {
      const r = readRecord(root, d.name);
      console.log([r.stage.padEnd(11), r.slug.padEnd(32), `${r.company} — ${r.title}`, r.history.at(-1)?.at.slice(0, 10)].join('  '));
    }
  },
};

// ---------- main ----------
const run = commands[cmd ?? ''];
if (!run) {
  console.error(`usage: apply <${Object.keys(commands).join('|')}> ...`);
  process.exit(2);
}
Promise.resolve(run()).catch((err: Error) => { console.error(`apply ${cmd}: ${err.message}`); process.exit(1); });
