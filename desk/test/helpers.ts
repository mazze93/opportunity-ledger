/** Test helpers: a real RS256 key pair and an Access-shaped JWT signer. */
import type { Jwk, KeyFetcher } from '../src/access.ts';

export const TEAM = 'example-team.cloudflareaccess.com';
export const AUD = 'a'.repeat(64);
export const OWNER = 'owner@example.com';
export const NOW = Date.parse('2026-11-25T12:00:00Z');

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const enc = (x: unknown) => b64url(new TextEncoder().encode(JSON.stringify(x)));

export async function keyPair(kid = 'k1') {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { privateKey: pair.privateKey, jwk: { kid, kty: 'RSA', n: jwk.n!, e: jwk.e!, alg: 'RS256' } as Jwk };
}

export async function sign(privateKey: CryptoKey, claims: Record<string, unknown> = {},
  header: Record<string, unknown> = { alg: 'RS256', kid: 'k1', typ: 'JWT' }): Promise<string> {
  const payload = { iss: `https://${TEAM}`, aud: [AUD], email: OWNER, type: 'app',
    iat: NOW / 1000 - 10, exp: NOW / 1000 + 3600, ...claims };
  const input = `${enc(header)}.${enc(payload)}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

export const staticKeys = (keys: Jwk[]): KeyFetcher => async () => keys;

export const ENV_BASE = {
  ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ALLOWED_EMAIL: OWNER,
  SIGNAL_DESK_REPO: 'mazze93/signal-desk', SIGNAL_DESK_TOKEN: 'github_pat_' + 'x'.repeat(40)
};

/** Marker that appears only inside fake signal-desk content. */
export const SENTINEL = 'SENTINEL-PRIVATE-FIT-NOTE-7f3a';

/** Fake GitHub contents API. Records every call so tests can prove none happened. */
export function fakeGitHub() {
  const calls: string[] = [];
  const files: Record<string, string> = {
    'claim-bank.md': `# Claim bank\n\n${SENTINEL} <script>alert(1)</script>`,
    'CALENDAR.md': '# Calendar', 'sweeps/2026-11-12.md': `# Sweep\n${SENTINEL}`,
    'applications/x/Resume.pdf': '%PDF-1.7 fake'
  };
  const dirs: Record<string, string[]> = {
    '': ['claim-bank.md', 'CALENDAR.md', 'sweeps', 'applications', '.github'],
    sweeps: ['2026-11-12.md', '2026-11-05.md', '.gitkeep'], plates: [], outreach: [], applications: ['x'],
    'applications/x': ['Resume.pdf']
  };
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const path = decodeURIComponent(url.pathname.replace('/repos/mazze93/signal-desk/contents', '').replace(/^\//, ''));
    if (path in dirs) {
      return Response.json(dirs[path].map(name => {
        const full = path ? `${path}/${name}` : name;
        return { name, path: full, type: full in dirs ? 'dir' : 'file', size: 10 };
      }));
    }
    if (path in files) {
      return Response.json({ type: 'file', path, size: files[path].length, encoding: 'base64',
        content: Buffer.from(files[path]).toString('base64') });
    }
    return new Response('{"message":"Not Found"}', { status: 404 });
  }) as typeof fetch;
  return { calls, fetchImpl };
}
