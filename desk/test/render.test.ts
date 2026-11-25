import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown, resolveRelative } from '../src/markdown.ts';
import { fetchCandidates } from '../src/ledger.ts';
import { safePath } from '../src/github.ts';

test('raw HTML and dangerous links never become markup', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)>\n\n[a](javascript:alert(1)) [b](https://x.test/"onmouseover=1) [c](data:text/html,1)');
  assert.ok(!/<img|<script/i.test(html));
  assert.ok(!html.includes('href="javascript'));
  assert.ok(!html.includes('href="data'));
  assert.ok(!/href="[^"]*"[^>]*onmouseover/.test(html), html);
});

test('common signal-desk shapes render', () => {
  const html = renderMarkdown('---\nstatus: drafted\n---\n# Title\n\n| A | B |\n|---|---|\n| 1 | **2** |\n\n- [ ] todo\n- [x] done\n\n```\n<b>x</b>\n```\n\nSee https://example.com/a. and `code`');
  assert.match(html, /<pre class="meta">status: drafted<\/pre>/);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<th scope="col">A<\/th>/);
  assert.match(html, /<strong>2<\/strong>/);
  assert.match(html, /☐ todo/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /<a href="https:\/\/example.com\/a">https:\/\/example.com\/a<\/a>\./);
  assert.match(html, /<code>code<\/code>/);
});

test('relative links stay inside the repository', () => {
  assert.equal(resolveRelative('plates', '../sweeps/2026-11-12.md'), '/sd/sweeps/2026-11-12.md');
  assert.equal(resolveRelative('', '../../etc/passwd'), null);
  assert.equal(resolveRelative('a', 'mailto:x@y'), null);
  assert.equal(resolveRelative('a', '//evil.test/x'), null);
});

test('path guard', () => {
  assert.equal(safePath('/sweeps/2026-11-12.md'), 'sweeps/2026-11-12.md');
  assert.equal(safePath('/'), '');
  for (const bad of ['/../x', '/a/%2e%2e/b', '/.git/config', '/a\\b', '/%E0%A4%A']) assert.equal(safePath(bad), null, bad);
});

test('ledger view: not connected, error, and untrusted rows', async () => {
  assert.deepEqual(await fetchCandidates(undefined, undefined), { state: 'not-connected' });
  const token = 't'.repeat(32);
  const failing = { fetch: async () => new Response('no', { status: 401 }) };
  assert.equal((await fetchCandidates(failing, token)).state, 'error');
  let auth = '';
  const ok = { fetch: async (_u: RequestInfo, init?: RequestInit) => {
    auth = new Headers(init?.headers).get('authorization') ?? '';
    return Response.json([{ company: 'A', title: 'Sec', canonical_url: 'javascript:alert(1)', score: 0.8, last_seen_at: '2026-11-20T00:00:00Z' },
      { company: 'B', title: 'Eng', canonical_url: 'https://jobs.test/1', score: 'x' }, { title: 'no company' }]);
  } };
  const v = await fetchCandidates(ok, token);
  assert.equal(auth, `Bearer ${token}`);
  assert.equal(v.state, 'ok');
  if (v.state === 'ok') {
    assert.equal(v.rows.length, 2);
    assert.equal(v.rows[0].url, null);
    assert.equal(v.rows[1].score, null);
  }
});
