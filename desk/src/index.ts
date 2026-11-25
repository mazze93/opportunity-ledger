/**
 * desk.mazzeleczzare.com — private, read-only desk over signal-desk and
 * the Opportunity Ledger.
 *
 * Request order is fixed and fails closed:
 *   1. GET only.
 *   2. Access config present, else 503 (no content, no upstream call).
 *   3. Cloudflare Access JWT verified for the one allowed email, else 403.
 *   4. Only then is GitHub or the ledger contacted.
 * Cloudflare Access in front of the hostname is the first gate; step 3 is
 * the second, so content stays private even if Access is misconfigured.
 */
import { cachedKeyFetcher, readAccessConfig, verifyAccessJwt, type KeyFetcher } from './access.ts';
import { latest, lookup, readSource, safePath } from './github.ts';
import { page, refuse, respond } from './html.ts';
import { fetchCandidates, type Fetcher } from './ledger.ts';
import { dirView, fileView, homeView, isText, ledgerTable } from './views.ts';

export interface Env {
  ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; ALLOWED_EMAIL?: string;
  SIGNAL_DESK_REPO?: string; SIGNAL_DESK_REF?: string; SIGNAL_DESK_TOKEN?: string;
  LEDGER?: Fetcher; LEDGER_TOKEN?: string;
}

export interface Deps { fetchImpl: typeof fetch; keys: KeyFetcher; now: () => number }

const HOME_FOLDERS = ['sweeps', 'plates', 'outreach', 'applications'];

async function serveSignalDesk(rawPath: string, env: Env, deps: Deps, email: string): Promise<Response> {
  const src = readSource(env as Record<string, unknown>);
  if (!src) return refuse(503, 'Signal-desk source is not configured.');
  const path = safePath(rawPath);
  if (path === null) return refuse(400, 'Path refused.');
  const found = await lookup(src, path, deps.fetchImpl);
  if (found.kind === 'missing') return refuse(404, 'Not found in signal-desk.');
  if (found.kind === 'upstream-error') return refuse(502, `GitHub answered HTTP ${found.status}.`);
  if (found.kind === 'dir') return page(path || 'signal-desk', dirView(path, found.entries), email);
  if (isText(found.path)) return page(found.path, fileView(found.path, found.bytes), email);
  const name = found.path.split('/').pop()!.replace(/[^A-Za-z0-9._-]/g, '_');
  return respond(found.bytes, 200, { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"` });
}

async function serveHome(env: Env, deps: Deps, email: string): Promise<Response> {
  const src = readSource(env as Record<string, unknown>);
  const folders = await Promise.all(HOME_FOLDERS.map(async f =>
    [f, src ? await latest(src, f, 6, deps.fetchImpl).catch(() => null) : null] as [string, Awaited<ReturnType<typeof latest>>]));
  const ledger = await fetchCandidates(env.LEDGER, env.LEDGER_TOKEN, 30);
  return page('Desk', homeView({ folders, ledger }), email);
}

/** Build the fetch handler. Tests inject deps; production uses defaults. */
export function createHandler(deps: Deps) {
  return async function handle(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'GET') return refuse(405, 'Read-only.');
    const cfg = readAccessConfig(env as Record<string, unknown>);
    if (!cfg) return refuse(503, 'Desk access is not configured.');
    const verdict = await verifyAccessJwt(req.headers.get('cf-access-jwt-assertion'), cfg, deps.keys, deps.now());
    if (!verdict.ok) {
      console.log(JSON.stringify({ event: 'desk.denied', reason: verdict.reason, path: new URL(req.url).pathname }));
      return refuse(403, 'Sign in through Cloudflare Access to use this desk.');
    }
    const url = new URL(req.url);
    try {
      if (url.pathname === '/') return await serveHome(env, deps, verdict.email);
      if (url.pathname === '/ledger') {
        return page('Ledger', `<h1>Opportunity Ledger</h1>${ledgerTable(await fetchCandidates(env.LEDGER, env.LEDGER_TOKEN, 100), 100)}`, verdict.email);
      }
      if (url.pathname === '/sd' || url.pathname.startsWith('/sd/')) {
        return await serveSignalDesk(url.pathname.slice(3), env, deps, verdict.email);
      }
      return refuse(404, 'Not found.');
    } catch {
      return refuse(502, 'An upstream read failed. Nothing was changed.');
    }
  };
}

const production = createHandler({ fetchImpl: (...a) => fetch(...a), keys: cachedKeyFetcher((...a) => fetch(...a)), now: () => Date.now() });

export default { fetch: (req: Request, env: Env) => production(req, env) };
