/**
 * Rendering for the small markdown subset the assistant is told to use.
 * Separate from the component so it can be unit-tested and so the component
 * file only exports components (Fast Refresh requirement).
 */

/* ─── Markdown (the small subset the assistant is told to use) ──────────── */

/**
 * Inline: **bold** and `code`. Tolerant of an unbalanced marker — a reply cut
 * off after "**XRPUSD (" previously rendered the asterisks literally. An
 * unmatched opener is now shown as plain text without the marker.
 */
export function inline(text) {
  const out = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[2] !== undefined) {
      out.push(
        <strong key={k++} className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
          {m[2]}
        </strong>,
      );
    } else {
      out.push(
        <code key={k++} className="rounded px-1 py-0.5 font-mono text-[12px]" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
          {m[3]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  let tail = text.slice(last);
  // strip a dangling opener rather than print it
  tail = tail.replace(/\*\*/g, '').replace(/`/g, '');
  if (tail) out.push(<span key={k++}>{tail}</span>);
  return out;
}

/**
 * Block renderer. Walks line by line and groups consecutive bullet lines into
 * a list WHEREVER they occur, rather than requiring a whole blank-line-
 * delimited block to be bullets.
 *
 * That distinction is why lists were rendering inline: the model writes
 *
 *     Here is how it works:
 *     * **Must be flat first**: ...
 *     * **Blocks new trades**: ...
 *
 * with no blank line after the intro. The old renderer treated that as one
 * block, saw the first line was not a bullet, and joined every line into a
 * single paragraph — asterisks and all.
 */
/**
 * The model sometimes runs bullets INTO the intro sentence on one line:
 *
 *     Here is how it works: * **Source**: ... * **Classification**: ...
 *
 * A lone " * " (space, asterisk, space) is never valid emphasis — bold is
 * "**" — so splitting on it is safe. Same for " - " after a colon or period.
 * Numbered steps run together ("1. Close. 2. Go to") are split on the number.
 */
function splitInlineBullets(text) {
  return text
    .replace(/\s+\*\s+(?=\S)/g, '\n* ')
    .replace(/([:.])\s+-\s+(?=\S)/g, '$1\n- ')
    .replace(/([:.])\s+(?=\d+[.)]\s+\S)/g, '$1\n');
}

export function renderReply(text) {
  const lines = splitInlineBullets(String(text).replace(/\r/g, '')).split('\n');
  const bullet = /^\s*(?:[-*•]|\d+[.)])\s+/;
  const numbered = /^\s*\d+[.)]\s+/;
  const heading = /^#{1,3}\s+(.*)$/;

  const out = [];
  let para = [];
  let list = null; // { ordered, items }
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      out.push(
        <p key={k++} className="leading-[1.6]">
          {inline(para.join(' '))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul';
      out.push(
        <Tag
          key={k++}
          className={`space-y-2 ${list.ordered ? 'list-decimal pl-5' : 'pl-0'}`}
          style={list.ordered ? { color: 'var(--dash-text-faint)' } : undefined}
        >
          {list.items.map((it, i) => (
            <li key={i} className={list.ordered ? 'pl-1 leading-relaxed' : 'flex gap-2.5 leading-relaxed'} style={{ color: 'var(--dash-text-secondary)' }}>
              {!list.ordered && (
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: 'var(--accent, #00d4aa)' }} />
              )}
              <span className="min-w-0">{inline(it)}</span>
            </li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') { flushPara(); flushList(); continue; }

    const h = heading.exec(line);
    if (h) {
      flushPara(); flushList();
      out.push(
        <p key={k++} className="pt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
          {h[1]}
        </p>,
      );
      continue;
    }

    if (bullet.test(line)) {
      flushPara();
      const ordered = numbered.test(line);
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push(line.replace(bullet, ''));
      continue;
    }

    // A non-bullet line directly after a list is a new paragraph, not a
    // continuation — the model does not wrap bullet text.
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();

  return <div className="space-y-3">{out}</div>;
}
