/** The deploy config must never open a URL outside Cloudflare Access. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const jsonc = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
const cfg = JSON.parse(jsonc);

test('only the Access-gated custom domain is reachable', () => {
  assert.equal(cfg.workers_dev, false);
  assert.equal(cfg.preview_urls, false);
  assert.deepEqual(cfg.routes, [{ pattern: 'desk.mazzeleczzare.com', custom_domain: true }]);
});

test('no identity or token values are committed as plain vars', () => {
  for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ALLOWED_EMAIL', 'SIGNAL_DESK_TOKEN', 'LEDGER_TOKEN']) {
    assert.ok(!(key in (cfg.vars ?? {})), key);
  }
});
