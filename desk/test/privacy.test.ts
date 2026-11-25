/**
 * The privacy claim, tested end to end through the real handler:
 * no request without a valid Access assertion for the owner can read
 * signal-desk content, and such a request never reaches GitHub or the ledger.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHandler } from '../src/index.ts';
import { ENV_BASE, NOW, SENTINEL, fakeGitHub, keyPair, sign, staticKeys } from './helpers.ts';

const ROUTES = ['/', '/sd', '/sd/', '/sd/claim-bank.md', '/sd/sweeps/', '/sd/sweeps/2026-11-12.md',
  '/sd/applications/x/Resume.pdf', '/ledger', '/sd/..%2F..%2Fetc', '/nope'];

async function setup() {
  const k = await keyPair(), gh = fakeGitHub();
  const handle = createHandler({ fetchImpl: gh.fetchImpl, keys: staticKeys([k.jwk]), now: () => NOW });
  return { k, gh, handle };
}
const get = (path: string, headers: Record<string, string> = {}, method = 'GET') =>
  new Request('https://desk.mazzeleczzare.com' + path, { method, headers });

test('unauthenticated and forged-identity requests get 403 on every route and never reach GitHub', async () => {
  const { gh, handle, k } = await setup();
  const wrongAud = await sign(k.privateKey, { aud: ['b'.repeat(64)] });
  const wrongEmail = await sign(k.privateKey, { email: 'intruder@example.com' });
  const attempts: Record<string, string>[] = [
    {},
    { 'cf-access-authenticated-user-email': 'owner@example.com' },
    { 'oai-authenticated-user-id': 'owner' },
    { authorization: 'Bearer anything' },
    { cookie: 'CF_Authorization=whatever' },
    { 'cf-access-jwt-assertion': 'not.a.jwt' },
    { 'cf-access-jwt-assertion': wrongAud },
    { 'cf-access-jwt-assertion': wrongEmail }
  ];
  for (const headers of attempts) for (const route of ROUTES) {
    const res = await handle(get(route, headers), ENV_BASE);
    const body = await res.text();
    assert.equal(res.status, 403, `${route} ${JSON.stringify(Object.keys(headers))}`);
    assert.ok(!body.includes(SENTINEL));
  }
  assert.deepEqual(gh.calls, [], 'GitHub must not be contacted before the identity check passes');
});

test('missing Access config fails closed with 503 even for a valid-looking token', async () => {
  const { gh, handle, k } = await setup();
  const token = await sign(k.privateKey);
  for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ALLOWED_EMAIL']) {
    const res = await handle(get('/sd/claim-bank.md', { 'cf-access-jwt-assertion': token }), { ...ENV_BASE, [key]: '' });
    assert.equal(res.status, 503);
    assert.ok(!(await res.text()).includes(SENTINEL));
  }
  assert.deepEqual(gh.calls, []);
});

test('writes are refused before anything else', async () => {
  const { gh, handle, k } = await setup();
  const token = await sign(k.privateKey);
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']) {
    assert.equal((await handle(get('/sd/claim-bank.md', { 'cf-access-jwt-assertion': token }, method), ENV_BASE)).status, 405);
  }
  assert.deepEqual(gh.calls, []);
});

test('the owner with a valid assertion can read, and raw HTML in drafts stays inert', async () => {
  const { handle, k } = await setup();
  const h = { 'cf-access-jwt-assertion': await sign(k.privateKey) };
  const res = await handle(get('/sd/claim-bank.md', h), ENV_BASE);
  const body = await res.text();
  assert.equal(res.status, 200);
  assert.ok(body.includes(SENTINEL));
  assert.ok(!body.includes('<script>alert(1)</script>') && body.includes('&lt;script&gt;'));
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.match(res.headers.get('content-security-policy')!, /default-src 'none'/);
  assert.match(res.headers.get('x-robots-tag')!, /noindex/);
});

test('owner home lists newest files first and hides dotfiles', async () => {
  const { handle, k } = await setup();
  const body = await (await handle(get('/', { 'cf-access-jwt-assertion': await sign(k.privateKey) }), ENV_BASE)).text();
  assert.ok(body.indexOf('2026-11-12.md') < body.indexOf('2026-11-05.md'));
  assert.ok(!body.includes('.gitkeep'));
  assert.ok(body.includes('not connected yet'));
});

// Note: a literal /sd/sweeps/%2e%2e/x is collapsed to /sd/x by the URL parser itself, so it
// never carries traversal; encoded slashes (%2F) are not collapsed and must be refused here.
test('owner path traversal and hidden folders are refused without a GitHub call', async () => {
  const { gh, handle, k } = await setup();
  const h = { 'cf-access-jwt-assertion': await sign(k.privateKey) };
  for (const p of ['/sd/..%2F..%2Fetc', '/sd/.github/workflows', '/sd/sweeps/..%2Fx', '/sd/a%5Cb']) {
    assert.equal((await handle(get(p, h), ENV_BASE)).status, 400, p);
  }
  assert.deepEqual(gh.calls, []);
});

test('binary files download as attachments, never rendered inline', async () => {
  const { handle, k } = await setup();
  const res = await handle(get('/sd/applications/x/Resume.pdf', { 'cf-access-jwt-assertion': await sign(k.privateKey) }), ENV_BASE);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/octet-stream');
  assert.match(res.headers.get('content-disposition')!, /^attachment; filename="Resume.pdf"$/);
});

const LEDGER_MARKER = 'LEDGER-PRIVATE-ROW';
const LEDGER_ROWS = [
  {
    company: `${LEDGER_MARKER} <script>alert(1)</script>`,
    title: 'Role " onclick="alert(1)',
    location_mode: 'remote <b>',
    canonical_url: 'javascript:alert(1)',
    score: 1,
    last_seen_at: '2026-11-20T00:00:00Z'
  },
  { company: `${LEDGER_MARKER} Beta`, title: 'Engineer', canonical_url: 'https://user:pass@jobs.example/role', score: 0.5, last_seen_at: '2026-11-21T00:00:00Z' },
  { company: `${LEDGER_MARKER} Gamma`, title: 'Analyst', canonical_url: 'http://jobs.example/insecure', score: 0.2, last_seen_at: '2026-11-22T00:00:00Z' },
  { company: `${LEDGER_MARKER} Delta`, title: 'Safe role', canonical_url: 'https://jobs.example/ok', score: 0.9, last_seen_at: '2026-11-23T00:00:00Z' }
];

async function deskWithLedger() {
  const k = await keyPair(), gh = fakeGitHub();
  const calls: { url: string; authorization: string }[] = [];
  const ledgerToken = 'L'.repeat(32);
  const ledger = {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), authorization: new Headers(init?.headers).get('authorization') ?? '' });
      return Response.json(LEDGER_ROWS);
    }
  };
  const handle = createHandler({ fetchImpl: gh.fetchImpl, keys: staticKeys([k.jwk]), now: () => NOW });
  const env = { ...ENV_BASE, LEDGER: ledger, LEDGER_TOKEN: ledgerToken };
  return { k, gh, calls, ledgerToken, handle, env };
}

test('a configured ledger is not contacted before Access accepts the caller', async () => {
  const { k, gh, calls, ledgerToken, handle, env } = await deskWithLedger();
  const owner = { 'cf-access-jwt-assertion': await sign(k.privateKey) };
  const denied: [Request, number][] = [
    [get('/'), 403],
    [get('/ledger'), 403],
    [get('/ledger', { 'cf-access-authenticated-user-email': 'owner@example.com' }), 403],
    [get('/', { authorization: `Bearer ${ledgerToken}` }), 403],
    [get('/ledger', { 'cf-access-jwt-assertion': 'not.a.jwt' }), 403],
    [get('/', { 'cf-access-jwt-assertion': await sign(k.privateKey, { email: 'intruder@example.com' }) }), 403],
    [get('/ledger', { 'cf-access-jwt-assertion': await sign(k.privateKey, { aud: ['b'.repeat(64)] }) }), 403]
  ];
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']) denied.push([get('/ledger', owner, method), 405]);
  for (const [req, status] of denied) {
    const res = await handle(req, env);
    const body = await res.text();
    assert.equal(res.status, status, `${req.method} ${new URL(req.url).pathname}`);
    assert.ok(!body.includes(LEDGER_MARKER), body);
    assert.ok(!body.includes(ledgerToken), body);
  }
  const unconfigured = await handle(get('/ledger', owner), { ...env, ALLOWED_EMAIL: '' });
  assert.equal(unconfigured.status, 503);
  assert.ok(!(await unconfigured.text()).includes(LEDGER_MARKER));
  assert.deepEqual(calls, []);
  assert.deepEqual(gh.calls, []);
});

test('authenticated ledger pages keep untrusted candidate fields as text', async () => {
  const { k, calls, ledgerToken, handle, env } = await deskWithLedger();
  const headers = { 'cf-access-jwt-assertion': await sign(k.privateKey) };
  const home = await handle(get('/', headers), env);
  const ledger = await handle(get('/ledger', headers), env);
  assert.equal(home.status, 200);
  assert.equal(ledger.status, 200);
  for (const res of [home, ledger]) {
    const body = await res.text();
    assert.ok(body.includes(`${LEDGER_MARKER} &lt;script&gt;alert(1)&lt;/script&gt;`), body);
    assert.ok(body.includes('Role &quot; onclick=&quot;alert(1)'), body);
    assert.ok(body.includes('remote &lt;b&gt;'), body);
    assert.ok(body.includes('href="https://jobs.example/ok"'), body);
    assert.ok(body.includes('Safe role'), body);
    assert.ok(!body.includes('<script'), body);
    assert.ok(!body.includes('<b>'), body);
    assert.ok(!body.includes('javascript:'), body);
    assert.ok(!body.includes('user:pass'), body);
    assert.ok(!body.includes('http://jobs.example'), body);
    assert.ok(!body.includes('onclick="'), body);
    assert.ok(!body.includes(ledgerToken), body);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  }
  assert.deepEqual(calls.map(c => ({ url: c.url, authorization: c.authorization })), [
    { url: 'https://opportunity-ledger.internal/opportunities?limit=30', authorization: `Bearer ${ledgerToken}` },
    { url: 'https://opportunity-ledger.internal/opportunities?limit=100', authorization: `Bearer ${ledgerToken}` }
  ]);
});
