/**
 * Escape-first Markdown renderer for signal-desk files.
 *
 * Every character of the source is HTML-escaped before any formatting is
 * applied, so raw HTML in a draft is shown as text and can never run.
 * Links are kept only for http(s) URLs, in-page anchors and in-repo
 * relative paths (rewritten to /sd/...). Covers what signal-desk uses:
 * front matter, headings, paragraphs, lists, task boxes, tables, quotes,
 * fenced code, rules, inline code, bold, italic and links. Pure.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const unescapeAmp = (s: string) => s.replace(/&amp;/g, '&');

/** Resolve a relative link against the folder of the current file. */
export function resolveRelative(fromDir: string, link: string): string | null {
  const [pathPart, hash = ''] = link.split('#', 2);
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart) || pathPart.startsWith('//')) return null;
  const stack = pathPart.startsWith('/') ? [] : fromDir.split('/').filter(Boolean);
  for (const seg of pathPart.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (!stack.length) return null; stack.pop(); continue; }
    stack.push(seg);
  }
  return '/sd/' + stack.join('/') + (hash ? '#' + hash : '');
}

/** Decide the href for an already-escaped URL, or null to drop the link. */
function href(escapedUrl: string, fromDir: string): string | null {
  const url = unescapeAmp(escapedUrl);
  if (/^https?:\/\/[^\s/]/i.test(url)) return escapedUrl;
  if (url.startsWith('#')) return escapedUrl;
  const local = resolveRelative(fromDir, url);
  return local === null ? null : escapeHtml(local);
}

function inline(raw: string, fromDir: string): string {
  // Split out code spans first so their contents are never formatted.
  return raw.split(/(`[^`]+`)/g).map(part => {
    if (/^`[^`]+`$/.test(part)) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    let s = escapeHtml(part);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
      const h = href(url, fromDir);
      return h === null ? text : `<a href="${h}">${text}</a>`;
    });
    // Bare URLs not already inside an anchor's href or text.
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+?)([.,;:)]*)(?=\s|$)/g,
      (_m, pre: string, url: string, trail: string) => `${pre}<a href="${url}">${url}</a>${trail}`);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return s;
  }).join('');
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_RULE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** Render one Markdown document. `fromDir` is the file's folder in the repo. */
export function renderMarkdown(source: string, fromDir = ''): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) { out.push(`<pre class="meta">${escapeHtml(lines.slice(1, end).join('\n'))}</pre>`); i = end + 1; }
  }
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), fromDir)}</p>`); para = []; } };
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      flush();
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence[1]); i++) body.push(lines[i]);
      out.push(`<pre><code>${escapeHtml(body.join('\n'))}</code></pre>`); i++; continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) { flush(); const n = heading[1].length; out.push(`<h${n}>${inline(heading[2], fromDir)}</h${n}>`); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
    if (line.trim().startsWith('|') && TABLE_RULE.test(lines[i + 1] ?? '')) {
      flush();
      const head = splitRow(line).map(c => `<th scope="col">${inline(c, fromDir)}</th>`).join('');
      const rows: string[] = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
        rows.push('<tr>' + splitRow(lines[i]).map(c => `<td>${inline(c, fromDir)}</td>`).join('') + '</tr>');
      }
      out.push(`<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const quote: string[] = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) quote.push(lines[i].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${renderMarkdown(quote.join('\n'), fromDir)}</blockquote>`); continue;
    }
    const item = line.match(LIST);
    if (item) {
      flush();
      const ordered = /\d/.test(item[2]);
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const m = lines[i].match(LIST);
        if (m) {
          const depth = Math.min(4, Math.floor(m[1].replace(/\t/g, '  ').length / 2));
          const text = m[3].replace(/^\[ \]\s+/, '☐ ').replace(/^\[[xX]\]\s+/, '☑ ');
          items.push(`<li class="d${depth}">${inline(text, fromDir)}</li>`);
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, ' ' + inline(lines[i].trim(), fromDir) + '</li>');
        } else break;
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue;
    }
    if (line.trim() === '') { flush(); i++; continue; }
    para.push(line.trim()); i++;
  }
  flush();
  return out.join('\n');
}
