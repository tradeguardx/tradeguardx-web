/**
 * sx("a:1;b:2") → React style object.
 *
 * The reference is normative and written as inline `style="…"` strings. Pasting
 * those strings verbatim and converting mechanically is the one way to be sure
 * no value is rounded or "tidied" on the way over (§1 of the build spec).
 * Parsed once per distinct string.
 */
const cache = new Map();

function camel(prop) {
  if (prop.startsWith('--')) return prop;
  const p = prop.startsWith('-webkit-') ? 'Webkit' + prop.slice(8) : prop;
  return p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function sx(str, extra) {
  let base = cache.get(str);
  if (!base) {
    base = {};
    // split on ';' but not inside url(...) or quotes
    let depth = 0, cur = '', parts = [];
    for (const ch of str) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    for (const part of parts) {
      const i = part.indexOf(':');
      if (i < 0) continue;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k) base[camel(k)] = v;
    }
    cache.set(str, base);
  }
  return extra ? { ...base, ...extra } : base;
}
