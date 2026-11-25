/**
 * Cloudflare Access JWT verification for desk.mazzeleczzare.com.
 *
 * Cloudflare Access signs every request it lets through with the
 * `Cf-Access-Jwt-Assertion` header (RS256). This module checks that token
 * itself, so the Worker refuses to serve signal-desk content even when a
 * request reaches it without passing Access (misconfigured route, a
 * workers.dev URL left on, or forged identity headers).
 *
 * Pure apart from the injected key fetcher. Fails closed on every doubt.
 */

export interface AccessConfig {
  /** e.g. "mazze.cloudflareaccess.com" (no scheme). */
  teamDomain: string;
  /** Application Audience (AUD) tag from the Access application. */
  aud: string;
  /** The one email allowed in. Compared case-insensitively. */
  allowedEmail: string;
}

export interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }
export type KeyFetcher = (teamDomain: string, forceRefresh: boolean) => Promise<Jwk[]>;
export type Verdict = { ok: true; email: string } | { ok: false; reason: string };

const TEAM_DOMAIN = /^[a-z0-9-]{1,63}\.cloudflareaccess\.com$/;
const AUD = /^[a-f0-9]{32,128}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

/** Returns a config only when all three values are present and well formed. */
export function readAccessConfig(env: Record<string, unknown>): AccessConfig | null {
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN ?? '').trim().toLowerCase();
  const aud = String(env.ACCESS_AUD ?? '').trim().toLowerCase();
  const allowedEmail = String(env.ALLOWED_EMAIL ?? '').trim().toLowerCase();
  if (!TEAM_DOMAIN.test(teamDomain) || !AUD.test(aud) || !EMAIL.test(allowedEmail)) return null;
  return { teamDomain, aud, allowedEmail };
}

function base64UrlToBytes(segment: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) throw new Error('bad base64url');
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(segment: string): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(segment)));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
  return value as Record<string, unknown>;
}

function audienceMatches(aud: unknown, expected: string): boolean {
  if (typeof aud === 'string') return aud.toLowerCase() === expected;
  return Array.isArray(aud) && aud.some(a => typeof a === 'string' && a.toLowerCase() === expected);
}

function claimsProblem(payload: Record<string, unknown>, cfg: AccessConfig, nowSeconds: number): string | null {
  if (payload.iss !== `https://${cfg.teamDomain}`) return 'issuer mismatch';
  if (!audienceMatches(payload.aud, cfg.aud)) return 'audience mismatch';
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) return 'expired or missing exp';
  if (payload.nbf !== undefined && (typeof payload.nbf !== 'number' || payload.nbf > nowSeconds + 60)) return 'not yet valid';
  if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== cfg.allowedEmail) return 'email not allowed';
  return null;
}

async function signatureValid(jwk: Jwk, signingInput: string, signature: Uint8Array<ArrayBuffer>): Promise<boolean> {
  if (jwk.kty !== 'RSA') return false;
  const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, new TextEncoder().encode(signingInput));
}

async function findKey(fetchKeys: KeyFetcher, teamDomain: string, kid: string): Promise<Jwk | undefined> {
  const cached = (await fetchKeys(teamDomain, false)).find(k => k.kid === kid);
  if (cached) return cached;
  // Access rotates keys; one forced refresh covers a rotation, then give up.
  return (await fetchKeys(teamDomain, true)).find(k => k.kid === kid);
}

/** Verify one Access assertion. `now` is milliseconds since the epoch. */
export async function verifyAccessJwt(token: string | null, cfg: AccessConfig, fetchKeys: KeyFetcher,
  now = Date.now()): Promise<Verdict> {
  if (!token) return { ok: false, reason: 'no access assertion' };
  if (token.length > 8192) return { ok: false, reason: 'assertion too long' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed assertion' };
  const [h, p, s] = parts;
  try {
    const header = decodeJson(h);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false, reason: 'unsupported algorithm' };
    const payload = decodeJson(p);
    const problem = claimsProblem(payload, cfg, Math.floor(now / 1000));
    if (problem) return { ok: false, reason: problem };
    const jwk = await findKey(fetchKeys, cfg.teamDomain, header.kid);
    if (!jwk) return { ok: false, reason: 'unknown signing key' };
    if (!await signatureValid(jwk, `${h}.${p}`, base64UrlToBytes(s))) return { ok: false, reason: 'bad signature' };
    return { ok: true, email: String(payload.email).toLowerCase() };
  } catch {
    return { ok: false, reason: 'unreadable assertion' };
  }
}

/**
 * Key fetcher with a 10-minute in-isolate cache.
 * Side effect: network GET to https://<team>/cdn-cgi/access/certs.
 */
export function cachedKeyFetcher(fetchImpl: typeof fetch, ttlMs = 600_000): KeyFetcher {
  let cache: { team: string; keys: Jwk[]; at: number } | null = null;
  return async (teamDomain, forceRefresh) => {
    if (!forceRefresh && cache && cache.team === teamDomain && Date.now() - cache.at < ttlMs) return cache.keys;
    const res = await fetchImpl(`https://${teamDomain}/cdn-cgi/access/certs`, { redirect: 'error' });
    if (!res.ok) throw new Error(`certs HTTP ${res.status}`);
    const body = await res.json() as { keys?: unknown };
    const keys = Array.isArray(body.keys) ? body.keys.filter((k): k is Jwk =>
      !!k && typeof k === 'object' && typeof (k as Jwk).kid === 'string' && typeof (k as Jwk).n === 'string'
      && typeof (k as Jwk).e === 'string') : [];
    cache = { team: teamDomain, keys, at: Date.now() };
    return keys;
  };
}
