/**
 * Page shell and response helpers for the desk. No JavaScript is sent.
 * Every response is private: no-store, noindex, no framing, strict CSP.
 * Pure.
 */
import { escapeHtml } from './markdown.ts';

export const SECURITY_HEADERS: Record<string, string> = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};

export function respond(body: BodyInit | null, status: number, extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...extra } });
}

/** A plain-text refusal. Says why in general terms; never echoes content. */
export function refuse(status: number, message: string): Response {
  return respond(message, status, { 'content-type': 'text/plain; charset=utf-8' });
}

// Contrast, measured 2026-11-25 (WCAG 2 formula) on bg #14130f / panel #1d1b16:
// text #ece7dc 15.07 / 13.95, muted #b4ab98 8.16 / 7.55, brass links #d9b56a
// 9.53 / 8.82. All clear AA (4.5:1). No animation is used, so
// prefers-reduced-motion needs no override.
const CSS = `
:root{color-scheme:dark;--bg:#14130f;--panel:#1d1b16;--line:#3a352b;--text:#ece7dc;--muted:#b4ab98;--brass:#d9b56a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 ui-serif,Georgia,serif}
a{color:var(--brass);text-underline-offset:3px}a:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:var(--panel);padding:.5rem}
header{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:baseline;padding:1rem 1.5rem;border-bottom:1px solid var(--line)}
header .mark{font:600 .8rem/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;text-transform:uppercase}
nav a{margin-right:1rem;font-family:ui-sans-serif,system-ui,sans-serif;font-size:.95rem}
.who{color:var(--muted);font:.8rem ui-monospace,Menlo,monospace}
main{max-width:60rem;margin:0 auto;padding:1.5rem}
h1,h2,h3{font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.25}h1{font-size:1.7rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:1rem}
.card h2{margin:0 0 .5rem;font-size:1rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.card ul,.list{list-style:none;padding:0;margin:0}.card li,.list li{padding:.25rem 0;border-bottom:1px dotted var(--line)}
.note{color:var(--muted)}pre{overflow:auto;background:var(--panel);border:1px solid var(--line);padding:1rem;font-size:.85rem}
pre.meta{color:var(--muted)}code{font-family:ui-monospace,Menlo,monospace;font-size:.9em}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.92rem}th,td{border:1px solid var(--line);padding:.4rem .5rem;text-align:left;vertical-align:top}
th{background:var(--panel)}blockquote{margin:1rem 0;padding-left:1rem;border-left:3px solid var(--brass);color:var(--muted)}
li.d1{margin-left:1.5rem}li.d2{margin-left:3rem}li.d3,li.d4{margin-left:4.5rem}
footer{max-width:60rem;margin:2rem auto;padding:0 1.5rem;color:var(--muted);font-size:.8rem}
@media (max-width:40rem){main{padding:1rem}header{padding:1rem}}`;

/** Full page. `bodyHtml` must already be escaped or rendered by markdown.ts. */
export function page(title: string, bodyHtml: string, email: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} · Signal Desk</title><style>${CSS}</style></head><body>
<a class="skip" href="#main">Skip to content</a>
<header><span class="mark">Signal Desk · private</span>
<nav aria-label="Desk"><a href="/">Desk</a><a href="/sd/">Files</a><a href="/ledger">Ledger</a><a href="/cdn-cgi/access/logout">Sign out</a></nav>
<span class="who">${escapeHtml(email)}</span></header>
<main id="main">${bodyHtml}</main>
<footer>Read-only view of signal-desk and the Opportunity Ledger. Nothing here is sent or published.</footer>
</body></html>`;
  return respond(html, 200, { 'content-type': 'text/html; charset=utf-8' });
}
