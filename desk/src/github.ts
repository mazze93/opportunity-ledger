/**
 * Read-only client for the private signal-desk repository.
 *
 * Content is fetched at request time through the GitHub REST contents API
 * with a fine-grained token scoped to that one repository (Contents: read).
 * Nothing from signal-desk is bundled into this public repository's build.
 *
 * Side effects: network GETs to api.github.com only.
 */

export interface DeskSource { repo: string; token: string; ref: string | null }
export interface Entry { name: string; path: string; type: 'file' | 'dir'; size: number }
export type Lookup =
  | { kind: 'dir'; entries: Entry[] }
  | { kind: 'file'; path: string; bytes: Uint8Array<ArrayBuffer> }
  | { kind: 'missing' }
  | { kind: 'upstream-error'; status: number };

const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
const REF = /^[A-Za-z0-9._\/-]{1,200}$/;
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._ -]{0,199}$/;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Returns a source only when repo and token look valid. */
export function readSource(env: Record<string, unknown>): DeskSource | null {
  const repo = String(env.SIGNAL_DESK_REPO ?? 'mazze93/signal-desk').trim();
  const token = String(env.SIGNAL_DESK_TOKEN ?? '').trim();
  const refRaw = String(env.SIGNAL_DESK_REF ?? '').trim();
  if (!REPO.test(repo) || token.length < 20 || /\s/.test(token)) return null;
  if (refRaw && (!REF.test(refRaw) || refRaw.includes('..'))) return null;
  return { repo, token, ref: refRaw || null };
}

/**
 * Normalize a repository path from the URL. Rejects traversal, hidden
 * segments (.git, .github, .gitkeep) and anything outside a plain charset.
 * Returns '' for the repository root, null when refused.
 */
export function safePath(raw: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  if (decoded.length > 400 || decoded.includes('\\') || decoded.includes('\0')) return null;
  const segments = decoded.split('/').filter(s => s.length > 0);
  if (!segments.every(s => SEGMENT.test(s) && s !== '..' && s !== '.')) return null;
  return segments.join('/');
}

function contentsUrl(src: DeskSource, path: string): string {
  const encoded = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const query = src.ref ? `?ref=${encodeURIComponent(src.ref)}` : '';
  return `https://api.github.com/repos/${src.repo}/contents/${encoded}${query}`;
}

function headers(src: DeskSource, accept: string): HeadersInit {
  return {
    authorization: `Bearer ${src.token}`,
    accept,
    'user-agent': 'signal-desk-view',
    'x-github-api-version': '2022-11-28'
  };
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toEntries(list: unknown[]): Entry[] {
  return list.flatMap(item => {
    const x = item as Record<string, unknown>;
    if (typeof x.name !== 'string' || typeof x.path !== 'string') return [];
    if (x.type !== 'file' && x.type !== 'dir') return [];
    if (safePath(x.path) !== x.path) return []; // hides dotfiles like .gitkeep
    const type: Entry['type'] = x.type;
    return [{ name: x.name, path: x.path, type, size: Number(x.size) || 0 }];
  }).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

async function rawFile(src: DeskSource, path: string, fetchImpl: typeof fetch): Promise<Lookup> {
  const res = await fetchImpl(contentsUrl(src, path), { headers: headers(src, 'application/vnd.github.raw+json'), redirect: 'follow' });
  if (!res.ok) return { kind: 'upstream-error', status: res.status };
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_FILE_BYTES) return { kind: 'upstream-error', status: 413 };
  return { kind: 'file', path, bytes };
}

/** Look up a file or directory. `path` must already have passed safePath. */
export async function lookup(src: DeskSource, path: string, fetchImpl: typeof fetch): Promise<Lookup> {
  const res = await fetchImpl(contentsUrl(src, path), { headers: headers(src, 'application/vnd.github+json'), redirect: 'error' });
  if (res.status === 404) return { kind: 'missing' };
  if (!res.ok) return { kind: 'upstream-error', status: res.status };
  const body: unknown = await res.json();
  if (Array.isArray(body)) return { kind: 'dir', entries: toEntries(body) };
  const file = body as Record<string, unknown>;
  if (file.type !== 'file') return { kind: 'missing' }; // symlinks and submodules are not served
  if (Number(file.size) > MAX_FILE_BYTES) return { kind: 'upstream-error', status: 413 };
  if (file.encoding === 'base64' && typeof file.content === 'string' && file.content.length > 0) {
    return { kind: 'file', path, bytes: base64ToBytes(file.content) };
  }
  return rawFile(src, path, fetchImpl); // GitHub omits content above 1 MB
}

/** Newest-first file names of one folder, for the desk home page. */
export async function latest(src: DeskSource, folder: string, count: number, fetchImpl: typeof fetch): Promise<Entry[] | null> {
  const found = await lookup(src, folder, fetchImpl);
  if (found.kind !== 'dir') return null;
  return [...found.entries].sort((a, b) => b.name.localeCompare(a.name)).slice(0, count);
}
