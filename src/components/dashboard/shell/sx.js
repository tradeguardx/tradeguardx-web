/**
 * sx("a:1;b:2") → React style object.
 *
 * The reference is normative and written as inline `style="…"` strings. Pasting
 * those strings verbatim and converting mechanically is the one way to be sure
 * no value is rounded or "tidied" on the way over (§1 of the build spec).
 * Parsed once per distinct string.
 *
 * Takes any number of layers — strings or plain objects — later ones winning,
 * so a shared base can be extended at the call site:
 *
 *   const FIELD = 'padding:11px;border-radius:10px';
 *   sx(FIELD, 'max-width:420px', { color: 'var(--ink)' })
 *
 * IT USED TO TAKE (str, extraObject) AND SPREAD THE SECOND ARGUMENT BLIND.
 * Passing a string as that second argument spread it character by character —
 * `{0:'m', 1:'a', 2:'x', …}` — and React wrote those onto the element's
 * CSSStyleDeclaration, where an indexed property has no setter. The throw
 * happens inside completeWork, so it is not caught as a render error in that
 * component: it takes the whole tree to the error boundary and the user gets
 * "Something went wrong" on a page that was working a second earlier. Nothing
 * in the signature hinted at it, which is why this now accepts both forms
 * rather than documenting the trap.
 */
const cache = new Map();

/**
 * `max-width` -> `maxWidth`, `-webkit-line-clamp` -> `WebkitLineClamp`.
 *
 * The vendor branch used to prepend `Webkit` to the un-camelised remainder and
 * camelise afterwards, giving `WebkitlineClamp` — a key React does not
 * recognise, so it dropped the declaration silently. Every -webkit- property
 * written through sx had simply never applied; the notification list's
 * two-line clamp is the visible one.
 */
function camel(prop) {
  if (prop.startsWith('--')) return prop;
  const vendor = prop.startsWith('-webkit-');
  const body = (vendor ? prop.slice(8) : prop).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return vendor ? 'Webkit' + body.charAt(0).toUpperCase() + body.slice(1) : body;
}

function parse(str) {
  let base = cache.get(str);
  if (base) return base;
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
  return base;
}

export function sx(...layers) {
  // The overwhelmingly common call. Returns the cached object as it always
  // has, so nothing re-parses and nothing extra is allocated per render.
  if (layers.length === 1 && typeof layers[0] === 'string') return parse(layers[0]);

  const out = {};
  for (const layer of layers) {
    if (!layer) continue;
    Object.assign(out, typeof layer === 'string' ? parse(layer) : layer);
  }
  return out;
}
