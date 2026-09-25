// RFC 8785/JCS for I-JSON values: ECMAScript number/string serialization and UTF-16 key order.
// Reject non-I-JSON input rather than silently changing its meaning.
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();
  function encode(v: unknown): string {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') {
      if (typeof v === 'string' && /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v))
        throw new Error('non-I-JSON surrogate');
      return JSON.stringify(v);
    }
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || !v || seen.has(v)) throw new Error('non-I-JSON value');
    seen.add(v);
    const result = Array.isArray(v)
      ? `[${v.map(encode).join(',')}]`
      : `{${Object.keys(v).sort().map(k => `${encode(k)}:${encode((v as Record<string, unknown>)[k])}`).join(',')}}`;
    seen.delete(v);
    return result;
  }
  return encode(value);
}

export async function sha256(bytes: ArrayBuffer | Uint8Array | string): Promise<string> {
  const input = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const stable = new Uint8Array(input.byteLength);
  stable.set(new Uint8Array(input));
  const digest = await crypto.subtle.digest('SHA-256', stable.buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function removeMarkup(input: string): string {
  return input.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, x =>
      ({'&nbsp;':' ', '&amp;':'&', '&lt;':'<', '&gt;':'>', '&quot;':'"', '&#39;':"'"})[x.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 60_000);
}
