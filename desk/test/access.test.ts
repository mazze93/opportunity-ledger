import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAccessConfig, verifyAccessJwt } from '../src/access.ts';
import { AUD, NOW, OWNER, TEAM, keyPair, sign, staticKeys } from './helpers.ts';

const cfg = { teamDomain: TEAM, aud: AUD, allowedEmail: OWNER };

test('a correctly signed assertion for the owner is accepted', async () => {
  const k = await keyPair();
  const v = await verifyAccessJwt(await sign(k.privateKey), cfg, staticKeys([k.jwk]), NOW);
  assert.deepEqual(v, { ok: true, email: OWNER });
});

test('email comparison ignores case but nothing else', async () => {
  const k = await keyPair();
  assert.equal((await verifyAccessJwt(await sign(k.privateKey, { email: 'Owner@Example.com' }), cfg, staticKeys([k.jwk]), NOW)).ok, true);
  assert.equal((await verifyAccessJwt(await sign(k.privateKey, { email: 'owner@example.com.evil' }), cfg, staticKeys([k.jwk]), NOW)).ok, false);
});

test('every wrong claim is refused', async () => {
  const k = await keyPair(), keys = staticKeys([k.jwk]);
  const cases: [Record<string, unknown>, string][] = [
    [{ aud: ['b'.repeat(64)] }, 'audience mismatch'],
    [{ iss: 'https://other.cloudflareaccess.com' }, 'issuer mismatch'],
    [{ exp: NOW / 1000 - 1 }, 'expired or missing exp'],
    [{ exp: undefined }, 'expired or missing exp'],
    [{ nbf: NOW / 1000 + 3600 }, 'not yet valid'],
    [{ email: 'someone@example.com' }, 'email not allowed'],
    [{ email: undefined }, 'email not allowed']
  ];
  for (const [claims, reason] of cases) {
    assert.deepEqual(await verifyAccessJwt(await sign(k.privateKey, claims), cfg, keys, NOW), { ok: false, reason });
  }
});

test('missing, malformed, unsigned and tampered assertions are refused', async () => {
  const k = await keyPair(), keys = staticKeys([k.jwk]);
  const good = await sign(k.privateKey);
  const [h, p, s] = good.split('.');
  const forged = Buffer.from(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], email: OWNER, exp: NOW / 1000 + 3600 })).toString('base64url');
  const none = Buffer.from(JSON.stringify({ alg: 'none', kid: 'k1' })).toString('base64url');
  for (const token of [null, '', 'a.b', `${h}.${forged}.${s}`, `${none}.${p}.`, `${h}.${p}.${s.slice(0, -4)}AAAA`, `${h}.${p}.!!`]) {
    assert.equal((await verifyAccessJwt(token, cfg, keys, NOW)).ok, false, String(token).slice(0, 30));
  }
});

test('a token signed by a key Access did not publish is refused', async () => {
  const real = await keyPair(), attacker = await keyPair();
  assert.deepEqual(await verifyAccessJwt(await sign(attacker.privateKey), cfg, staticKeys([real.jwk]), NOW), { ok: false, reason: 'bad signature' });
  const other = await keyPair('k2');
  assert.deepEqual(await verifyAccessJwt(await sign(other.privateKey, {}, { alg: 'RS256', kid: 'k2' }), cfg, staticKeys([real.jwk]), NOW),
    { ok: false, reason: 'unknown signing key' });
});

test('a key fetch failure fails closed', async () => {
  const k = await keyPair();
  const v = await verifyAccessJwt(await sign(k.privateKey), cfg, async () => { throw new Error('down'); }, NOW);
  assert.equal(v.ok, false);
});

test('config is null unless all three values are present and well formed', () => {
  const full = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ALLOWED_EMAIL: OWNER };
  assert.ok(readAccessConfig(full));
  for (const key of Object.keys(full)) assert.equal(readAccessConfig({ ...full, [key]: '' }), null, key);
  assert.equal(readAccessConfig({ ...full, ACCESS_TEAM_DOMAIN: 'evil.example.com' }), null);
});
