import assert from 'node:assert/strict';
import { test } from 'node:test';
import policyFile from '../policies/security-content-us.json';
import { boardUrl, parseBoard } from '../src/adapters';
import { canonicalJson, sha256 } from '../src/canonical';
import { Canonical, Policy, Target } from '../src/contracts';
import { evaluate } from '../src/policy';

const policy = Policy.parse(policyFile);
const now = '2026-09-25T12:00:00.000Z';
const base = Canonical.parse({
  schemaVersion:'1',provider:'ashby-postings',sourceId:'https://jobs.ashbyhq.com/example/123',
  company:'Example',title:'Security Content Strategist',locationRaw:'Remote, United States',
  locationMode:'remote',countryUS:'yes',canonicalUrl:'https://jobs.ashbyhq.com/example/123',
  descriptionText:'Cloud security and developer education',postedAt:'2026-09-24T12:00:00.000Z'
});

test('canonical digest is stable across object property ordering and changes when input changes', async () => {
  assert.equal(canonicalJson({b:2,a:1}), '{"a":1,"b":2}');
  assert.equal(await sha256(canonicalJson({b:2,a:1})), await sha256(canonicalJson({a:1,b:2})));
  assert.notEqual(await sha256('one'), await sha256('two'));
  assert.throws(() => canonicalJson({v:undefined}));
});

test('explicit remote US candidate has feature-level evidence and repeatable score', () => {
  const a = evaluate(base, policy, now), b = evaluate(base, policy, now);
  assert.deepEqual(a, b);
  assert.equal(a.disposition, 'candidate');
  assert.ok(a.score! > 0.7);
  assert.deepEqual(a.features.locationMatch.evidence, ['locationMode:remote','countryUS:yes']);
  assert.ok(a.features.domainMatch.evidence.includes('titleOrDescription:security'));
});

test('unknown US eligibility does not leak into candidates', () => {
  const c = { ...base, locationRaw:'Remote', countryUS:'unknown' as const };
  const e = evaluate(c, policy, now);
  assert.equal(e.disposition, 'reject');
  assert.equal(e.score, null);
  assert.equal(e.predicates.locationEligibility.result, 'reject');
});

test('hard exclusions dominate otherwise strong scores', () => {
  const e = evaluate({ ...base, title:'Software Engineer, Security Content' }, policy, now);
  assert.equal(e.disposition, 'reject');
  assert.deepEqual(e.features, {});
});

test('missing publication time is explicit and cannot earn recency points', () => {
  const e = evaluate({ ...base, postedAt:null }, policy, now);
  assert.equal(e.disposition, 'candidate');
  assert.deepEqual(e.features.recency, {value:0, weight:0.1, contribution:0, evidence:['postedAt:unknown']});
});

test('provider URL is constructed from a validated board token', () => {
  const t = Target.parse({provider:'lever-postings',board:'example',company:'Example'});
  assert.equal(boardUrl(t, 1), 'https://api.lever.co/v0/postings/example?mode=json&limit=100&skip=100');
  assert.throws(() => boardUrl({...t,board:'../metadata'}));
  assert.throws(() => boardUrl(t, 10));
});

test('Ashby keeps the original JSON pointer after hiding unlisted jobs', () => {
  const t = Target.parse({provider:'ashby-postings',board:'example',company:'Example'});
  const jobs = parseBoard(t, {jobs:[
    {title:'Hidden',jobUrl:'https://jobs.ashbyhq.com/example/hidden',isListed:false},
    {title:'Security Content',jobUrl:'https://jobs.ashbyhq.com/example/visible',
      location:'Remote, United States',isRemote:true,publishedAt:now}
  ]});
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].pointer, '/jobs/1');
  assert.equal(jobs[0].canonical.sourceId, 'https://jobs.ashbyhq.com/example/visible');
});

test('Greenhouse updated_at is not misrepresented as publication time', () => {
  const t = Target.parse({provider:'greenhouse-job-board',board:'example',company:'Example'});
  const [{canonical}] = parseBoard(t, {jobs:[{id:1,title:'Content Strategy',
    location:{name:'Remote, US'},absolute_url:'https://boards.greenhouse.io/example/jobs/1',
    content:'<p>Security</p>',updated_at:now}]});
  assert.equal(canonical.postedAt, null);
  assert.equal(canonical.descriptionText, 'Security');
});
