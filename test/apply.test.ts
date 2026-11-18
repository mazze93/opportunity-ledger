// Tests for scripts/apply: the one-yes application runner.
// Each test builds its own temp records dir OUTSIDE the repo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { makeSubmitCopies, plainName } from '../scripts/apply/copies.ts';
import { arm, askText, checkGrant, confirm, disarm, issueGrant, readiness } from '../scripts/apply/grant.ts';
import { scan, selfTest } from '../scripts/apply/prose.ts';
import { newRecord, recordDir, resolveDir, writeRecord, type ApplicationRecord } from '../scripts/apply/record.ts';

const REPO = resolve(import.meta.dirname, '..');
const approval = { messageId: 'cmsg_test', quote: 'yes, submit it', at: '2026-11-18T00:00:00.000Z' };

// ---------- fixtures ----------
function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'apply-'));
  const src = join(root, 'build');
  execFileSync('mkdir', ['-p', src]);
  writeFileSync(join(src, 'Resume_Acme_v1.2.0.pdf'), 'resume v1.2.0');
  writeFileSync(join(src, 'Cover_Letter_Acme_v1.0.0.pdf'), 'letter v1.0.0');
  return { dir: join(root, 'records'), src };
}

function readyRecord(dir: string, src: string): ApplicationRecord {
  const rec = newRecord({ slug: 'acme-sec', company: 'Acme', title: 'Security Engineer', url: 'https://jobs.example.com/acme/1' });
  rec.fit = { verdict: 'apply', reasons: ['matches'], gaps: ['years'], postingOpen: true, at: approval.at };
  rec.answers = { 'Authorized to work': 'Yes' };
  rec.files = makeSubmitCopies(recordDir(dir, rec.slug), [join(src, 'Resume_Acme_v1.2.0.pdf'), join(src, 'Cover_Letter_Acme_v1.0.0.pdf')]);
  for (const g of ['touchstone', 'prose', 'facts'] as const) rec.gates[g] = { result: 'pass', note: 'ok', at: approval.at };
  writeRecord(dir, rec);
  return rec;
}

// ---------- records dir ----------
test('records dir inside the public repo is refused; outside is accepted', () => {
  assert.throws(() => resolveDir(join(REPO, 'applications')), /outside the public repository/);
  assert.throws(() => resolveDir(REPO), /outside the public repository/);
  assert.throws(() => resolveDir(undefined), /APPLICATIONS_DIR/);
  assert.equal(resolveDir(join(tmpdir(), 'x')), join(tmpdir(), 'x'));
});

// ---------- submit copies ----------
test('submit copies drop version numbers and replace stale copies', () => {
  assert.equal(plainName('/a/Resume_Acme_v1.2.0.pdf'), 'Resume_Acme.pdf');
  assert.equal(plainName('Letter-v3.docx'), 'Letter.docx');
  assert.equal(plainName('Resume.pdf'), 'Resume.pdf');
  assert.throws(() => plainName('Resume_v2_final.pdf'), /cannot strip version/);

  const { dir, src } = workspace();
  const recDir = recordDir(dir, 'acme-sec');
  writeFileSync(join(src, 'Old_v0.9.pdf'), 'stale');
  makeSubmitCopies(recDir, [join(src, 'Old_v0.9.pdf')]);
  const files = makeSubmitCopies(recDir, [join(src, 'Resume_Acme_v1.2.0.pdf')]);
  assert.deepEqual(files.map(f => f.name), ['Resume_Acme.pdf']);
  assert.ok(!existsSync(join(recDir, 'submit', 'Old.pdf')), 'stale copy from an earlier build must be gone');
  assert.match(readFileSync(join(recDir, 'submit', 'SOURCE.md'), 'utf8'), /Resume_Acme_v1\.2\.0\.pdf/);
  assert.throws(() => makeSubmitCopies(recDir, [join(src, 'Resume_Acme_v1.2.0.pdf'), join(src, 'Resume_Acme_v1.2.0.pdf')]), /same submit name/);
  const renamed = makeSubmitCopies(recDir, [`${join(src, 'Resume_Acme_v1.2.0.pdf')}=Jane_Doe_Resume.pdf`]);
  assert.deepEqual(renamed.map(f => [f.name, f.from]), [['Jane_Doe_Resume.pdf', 'Resume_Acme_v1.2.0.pdf']]);
  assert.deepEqual(makeSubmitCopies(recDir, [`${join(src, 'Resume_Acme_v1.2.0.pdf')}=Resume_v2.pdf`]).map(f => f.name), ['Resume.pdf']);
  assert.throws(() => makeSubmitCopies(recDir, [`${join(src, 'Resume_Acme_v1.2.0.pdf')}=../escape.pdf`]), /plain file name/);
});

// ---------- the yes ----------
test('no yes can be recorded before fit, copies and all three gates pass', async () => {
  const rec = newRecord({ slug: 'acme-sec', company: 'Acme', title: 'T', url: 'https://jobs.example.com/1' });
  const missing = readiness(rec);
  assert.ok(missing.some(m => /fit verdict/.test(m)));
  assert.ok(missing.some(m => /submit copies/.test(m)));
  assert.equal(missing.filter(m => /^gate /.test(m)).length, 3);
  await assert.rejects(issueGrant(rec, approval), /not ready for a yes/);
});

test('the yes stops covering the submit when files, answers, gates or time change', async () => {
  const { dir, src } = workspace();
  const recDir = recordDir(dir, 'acme-sec');
  const t0 = new Date('2026-11-18T00:00:00Z');

  const changedFile = await issueGrant(readyRecord(dir, src), approval, 14, t0);
  await checkGrant(changedFile, recDir, t0);
  writeFileSync(join(recDir, 'submit', 'Resume_Acme.pdf'), 'edited after the yes');
  await assert.rejects(checkGrant(changedFile, recDir, t0), /changed on disk/);

  const changedAnswer = await issueGrant(readyRecord(dir, src), approval, 14, t0);
  changedAnswer.answers['Sponsorship needed'] = 'No';
  await assert.rejects(checkGrant(changedAnswer, recDir, t0), /changed since the yes/);

  const failedGate = await issueGrant(readyRecord(dir, src), approval, 14, t0);
  failedGate.gates.facts = { result: 'fail', note: 'date wrong', at: t0.toISOString() };
  await assert.rejects(checkGrant(failedGate, recDir, t0), /gate facts/);

  const late = await issueGrant(readyRecord(dir, src), approval, 14, t0);
  await assert.rejects(checkGrant(late, recDir, new Date('2026-12-03T00:00:00Z')), /expired/);
});

test('a yes for one role does not cover a different posting', async () => {
  const { dir, src } = workspace();
  const recDir = recordDir(dir, 'acme-sec');
  const t0 = new Date('2026-11-18T00:00:00Z');
  const rec = await issueGrant(readyRecord(dir, src), approval, 14, t0);
  const posting = { ...rec.posting };
  assert.equal(rec.stage, 'granted');

  const refused = async (next: ApplicationRecord['posting']) => {
    rec.posting = next;
    await assert.rejects(arm(rec, recDir, t0), /changed since the yes/);
    assert.equal(existsSync(join(recDir, 'submit.armed')), false, 'a refused arm must not record a Submit click');
    assert.equal(existsSync(join(recDir, `nonce.${rec.grant?.nonce}.consumed`)), false);
    assert.equal(rec.stage, 'granted');
  };

  // The stored grant target has no url; the url is bound only through the draft digest.
  await refused({ ...posting, url: 'https://jobs.example.com/other-role/2' });
  await refused({ ...posting, opportunityId: 'other-role' });
  await refused({ ...posting, provider: 'greenhouse-job-board' });

  rec.posting = posting;
  await checkGrant(rec, recDir, t0);
});

// ---------- the retry guard ----------
test('a restart after clicking Submit cannot click again until the outcome is seen', async () => {
  const { dir, src } = workspace();
  const recDir = recordDir(dir, 'acme-sec');
  const rec = await issueGrant(readyRecord(dir, src), approval);

  await arm(rec, recDir);
  await assert.rejects(arm(rec, recDir), /already on record with no confirmation/);
  assert.throws(() => disarm(rec, recDir, ''), /say what showed/);

  disarm(rec, recDir, 'no confirmation page, no email after 10 min');
  assert.equal(rec.stage, 'granted');
  await arm(rec, recDir);
  confirm(rec, recDir, 'Ashby: "Application submitted"');
  assert.equal(rec.stage, 'submitted');
  await assert.rejects(checkGrant(rec, recDir), /already used/);
  await assert.rejects(arm(rec, recDir), /already used/);
});

test('the ask names everything the yes covers', async () => {
  const { dir, src } = workspace();
  const text = askText(readyRecord(dir, src));
  for (const s of ['Security Engineer at Acme', 'https://jobs.example.com/acme/1', 'Resume_Acme.pdf', 'Cover_Letter_Acme.pdf', 'Authorized to work: Yes', 'years'])
    assert.ok(text.includes(s), `ask is missing ${s}`);
});

// ---------- prose gate ----------
test('prose probes are not blind, flag Claude-isms and honour recorded acceptances', () => {
  assert.deepEqual(selfTest(), []);
  const app = {
    letter: { paragraphs: ["It's not a tool, it's a practice.", 'I shipped it — twice.'], close: 'Best,' },
    resume: { summary: 'Security engineer.', roles: [{ bullets: ['Built the fuzzer.'] }] },
    proseAccepted: ['—'],
  };
  const hits = scan(app);
  assert.ok(hits.some(h => h.probe === 'its_not_its' && !h.accepted));
  assert.ok(hits.some(h => h.probe === 'em_dash' && h.accepted));
  assert.equal(scan({ letter: { paragraphs: ['I built a fuzzer and filed two advisories.'] } }).length, 0);
});

// ---------- end to end through the CLI ----------
test('CLI runs a posting from record to submitted with one recorded yes', () => {
  const { dir, src } = workspace();
  const env = { ...process.env, APPLICATIONS_DIR: dir };
  const apply = (...args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', 'scripts/apply/cli.ts', ...args], { cwd: REPO, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const fails = (...args: string[]) => assert.throws(() => apply(...args));

  writeFileSync(join(dir, '..', 'answers.json'), JSON.stringify({ 'Authorized to work in the US': 'Yes', 'Requires sponsorship': 'No' }));
  writeFileSync(join(dir, '..', 'app.json'), JSON.stringify({ letter: { paragraphs: ['I built a fuzzer and filed two advisories.'] } }));
  execFileSync('mkdir', ['-p', dir]);
  writeFileSync(join(dir, 'profile.json'), JSON.stringify({ fields: { 'Preferred name': 'Test' } }));

  apply('init', 'acme-sec', '--company', 'Acme', '--title', 'Security Engineer', '--url', 'https://jobs.example.com/acme/1');
  fails('ready', 'acme-sec');
  apply('fit', 'acme-sec', '--verdict', 'apply', '--open', 'yes', '--reason', 'CVE work matches', '--gap', 'years');
  apply('answers', 'acme-sec', '--file', join(dir, '..', 'answers.json'));
  apply('copies', 'acme-sec', join(src, 'Resume_Acme_v1.2.0.pdf'), join(src, 'Cover_Letter_Acme_v1.0.0.pdf'));
  apply('prose', 'acme-sec', join(dir, '..', 'app.json'));
  apply('gate', 'acme-sec', 'touchstone', 'pass', '--note', 'every line maps to a proof-bank entry');
  apply('gate', 'acme-sec', 'facts', 'pass', '--note', 'posting open today; dates match');
  assert.match(apply('ready', 'acme-sec'), /Submit Security Engineer at Acme\?/);
  fails('plan', 'acme-sec');
  apply('grant', 'acme-sec', '--message', 'cmsg_x', '--quote', 'yes');
  const plan = JSON.parse(apply('plan', 'acme-sec'));
  assert.equal(plan.fields['Requires sponsorship'], 'No');
  assert.equal(plan.fields['Preferred name'], 'Test');
  assert.equal(plan.files.length, 2);
  apply('arm', 'acme-sec');
  fails('arm', 'acme-sec');
  apply('confirm', 'acme-sec', '--evidence', 'confirmation page');
  assert.match(apply('status'), /^submitted\s+acme-sec/m);
  fails('arm', 'acme-sec');
});
