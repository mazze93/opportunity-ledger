/**
 * Read-only view of the Opportunity Ledger's current candidates.
 *
 * Talks to the ledger Worker over a Cloudflare service binding (no public
 * hop) with the ledger's own bearer token. When the binding or token is
 * absent the desk still works and says the ledger is not connected.
 * Side effects: one request to the bound ledger Worker.
 */

export interface Fetcher { fetch(input: Request | string, init?: RequestInit): Promise<Response> }

export interface Candidate {
  company: string; title: string; mode: string; url: string | null;
  score: number | null; lastSeen: string | null;
}

export type LedgerView =
  | { state: 'not-connected' }
  | { state: 'error'; message: string }
  | { state: 'ok'; rows: Candidate[] };

const MAX_BYTES = 1024 * 1024;
const text = (x: unknown, max = 200) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function httpsOrNull(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  try { const u = new URL(x); return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null; }
  catch { return null; }
}

/** Shape one ledger row. Unknown or missing fields become explicit nulls. */
export function toCandidate(row: unknown): Candidate | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const company = text(r.company), title = text(r.title);
  if (!company || !title) return null;
  return {
    company, title,
    mode: text(r.location_mode, 40) || 'unknown',
    url: httpsOrNull(r.canonical_url),
    score: typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null,
    lastSeen: typeof r.last_seen_at === 'string' && Number.isFinite(Date.parse(r.last_seen_at)) ? r.last_seen_at : null
  };
}

export async function fetchCandidates(binding: Fetcher | undefined, token: string | undefined,
  limit = 30): Promise<LedgerView> {
  if (!binding || !token || token.length < 32) return { state: 'not-connected' };
  try {
    const res = await binding.fetch(`https://opportunity-ledger.internal/opportunities?limit=${limit}`,
      { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { state: 'error', message: `Ledger answered HTTP ${res.status}` };
    const raw = await res.text();
    if (raw.length > MAX_BYTES) return { state: 'error', message: 'Ledger response too large' };
    const body: unknown = JSON.parse(raw);
    if (!Array.isArray(body)) return { state: 'error', message: 'Ledger response was not a list' };
    return { state: 'ok', rows: body.map(toCandidate).filter((c): c is Candidate => c !== null) };
  } catch {
    return { state: 'error', message: 'Ledger could not be reached' };
  }
}
