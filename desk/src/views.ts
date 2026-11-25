/**
 * HTML fragments for each desk page. Every value that came from GitHub or
 * the ledger passes through escapeHtml or renderMarkdown. Pure.
 */
import type { Entry } from './github.ts';
import type { LedgerView } from './ledger.ts';
import { escapeHtml, renderMarkdown } from './markdown.ts';

const TEXT_EXT = /\.(txt|js|mjs|ts|py|sh|json|jsonc|ya?ml|toml|csv)$/i;

export const sdHref = (path: string, dir = false) =>
  '/sd/' + path.split('/').map(encodeURIComponent).join('/') + (dir && path ? '/' : '');

function entryList(entries: Entry[]): string {
  if (!entries.length) return '<p class="note">Empty.</p>';
  return '<ul class="list">' + entries.map(e =>
    `<li><a href="${escapeHtml(sdHref(e.path, e.type === 'dir'))}">${escapeHtml(e.name)}${e.type === 'dir' ? '/' : ''}</a></li>`).join('') + '</ul>';
}

function breadcrumb(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => {
    const sub = parts.slice(0, i + 1).join('/');
    return i === parts.length - 1 ? escapeHtml(p) : `<a href="${escapeHtml(sdHref(sub, true))}">${escapeHtml(p)}</a>`;
  });
  return `<p class="note"><a href="/sd/">signal-desk</a>${crumbs.length ? ' / ' + crumbs.join(' / ') : ''}</p>`;
}

export function dirView(path: string, entries: Entry[]): string {
  return `${breadcrumb(path)}<h1>${escapeHtml(path || 'signal-desk')}</h1>${entryList(entries)}`;
}

export function isText(path: string): boolean { return /\.md$/i.test(path) || TEXT_EXT.test(path); }

export function fileView(path: string, bytes: Uint8Array): string {
  const source = new TextDecoder('utf-8').decode(bytes);
  const dir = path.split('/').slice(0, -1).join('/');
  const body = /\.md$/i.test(path) ? renderMarkdown(source, dir) : `<pre><code>${escapeHtml(source)}</code></pre>`;
  return `${breadcrumb(path)}<article>${body}</article>`;
}

export function ledgerTable(view: LedgerView, limit: number): string {
  if (view.state === 'not-connected') {
    return '<p class="note">The Opportunity Ledger is not connected yet. Deploy it, then add the LEDGER service binding and LEDGER_TOKEN secret (desk/README.md).</p>';
  }
  if (view.state === 'error') return `<p class="note">${escapeHtml(view.message)}. Signal-desk files still work.</p>`;
  if (!view.rows.length) return '<p class="note">The ledger has no current candidates under its policy.</p>';
  const rows = view.rows.slice(0, limit).map(c => {
    const title = c.url ? `<a href="${escapeHtml(c.url)}" rel="noreferrer">${escapeHtml(c.title)}</a>` : escapeHtml(c.title);
    const score = c.score === null ? 'n/a' : c.score.toFixed(2);
    const seen = c.lastSeen ? escapeHtml(c.lastSeen.slice(0, 10)) : 'unknown';
    return `<tr><td>${escapeHtml(c.company)}</td><td>${title}</td><td>${escapeHtml(c.mode)}</td><td>${score}</td><td>${seen}</td></tr>`;
  }).join('');
  return `<div class="table"><table><caption class="note">Policy candidates from the ledger. Scores explain relevance; they do not establish eligibility.</caption>
<thead><tr><th scope="col">Company</th><th scope="col">Role</th><th scope="col">Mode</th><th scope="col">Score</th><th scope="col">Last seen</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export interface HomeData { folders: [string, Entry[] | null][]; ledger: LedgerView }

export function homeView(data: HomeData): string {
  const cards = data.folders.map(([folder, entries]) => `<section class="card" aria-labelledby="h-${escapeHtml(folder)}">
<h2 id="h-${escapeHtml(folder)}"><a href="${escapeHtml(sdHref(folder, true))}">${escapeHtml(folder)}</a></h2>
${entries === null ? '<p class="note">Could not read this folder.</p>' : entryList(entries)}</section>`).join('');
  return `<h1>Signal Desk</h1>
<p><a href="/sd/CALENDAR.md">Calendar</a> · <a href="/sd/EDITORIAL-GATE.md">Editorial gate</a> · <a href="/sd/claim-bank.md">Claim bank</a></p>
<div class="grid">${cards}</div>
<h2>Opportunity Ledger · top candidates</h2>${ledgerTable(data.ledger, 10)}
<p><a href="/ledger">All candidates</a></p>`;
}
