import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { detectCountry } from '../../lib/geo';
import {
  countryOptions,
  defaultPhoneCountry,
  dialCodeOf,
  digitsOf,
  examplePlaceholder,
  flagOf,
  formatTyped,
  isSupportedCountry,
  isValidE164,
  searchCountries,
  splitE164,
  toE164,
} from '../../lib/phone';

/**
 * International phone field: a country picker (flag + dial code) and the
 * national number, formatted as it is typed.
 *
 * Replaces the fixed "🇮🇳 +91" + 10-digit field. The value in and out is E.164
 * ("+971501234567") so callers never deal with country codes themselves; what
 * the person sees is their own country's format.
 *
 * The picker opens IN FLOW below the field rather than floating over it. The
 * first-time prompt is an overflow-hidden card and the support panel is a
 * scroll box — a floating list gets clipped in both, and at 390 px there is
 * no room beside the field for one anyway.
 *
 * `variant` matches the input styling of the three places that use it:
 *   'prompt'   — first-time PhonePrompt dialog
 *   'settings' — Alerts page
 *   'support'  — support chat handoff form
 */

const VARIANTS = {
  prompt: {
    radius: 12,
    bg: 'var(--surface-2)',
    border: 'var(--line-input)',
    line: 'var(--line)',
    text: 'var(--ink)',
    muted: 'var(--ink-3)',
    selectorText: 'var(--ink-2)',
    selectorBg: 'transparent',
    selectorFont: { fontWeight: 600, fontSize: 15 },
    inputClass: 'px-3.5 py-3 text-[16px] tracking-wide',
    panelBg: 'var(--surface)',
    hover: 'var(--surface-2)',
    accent: 'var(--mint-solid)',
  },
  settings: {
    radius: 10,
    bg: 'var(--surface-2)',
    border: 'var(--line-strong)',
    line: 'var(--line-strong)',
    text: 'var(--ink)',
    muted: 'var(--ink-3)',
    selectorText: 'var(--ink-2)',
    selectorBg: 'var(--surface-3)',
    selectorFont: { fontWeight: 500, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" },
    // 16px on phones: iOS zooms the page into any input under 16px on focus.
    inputClass: 'px-[13px] py-[11px] text-[16px] sm:text-[13px] tabular-nums',
    panelBg: 'var(--surface)',
    hover: 'var(--surface-2)',
    accent: 'var(--ink)',
  },
  support: {
    radius: 12,
    bg: 'var(--dash-bg-input)',
    border: 'var(--dash-border)',
    line: 'var(--dash-border)',
    text: 'var(--dash-text-primary)',
    muted: 'var(--dash-text-faint)',
    selectorText: 'var(--dash-text-secondary)',
    selectorBg: 'transparent',
    selectorFont: { fontWeight: 600, fontSize: 13 },
    inputClass: 'px-3 py-2.5 text-[13px]',
    panelBg: 'var(--dash-bg-card, var(--dash-bg-input))',
    hover: 'var(--dash-bg-card-hover, var(--dash-bg-input))',
    accent: 'var(--accent, #00d4aa)',
  },
};

/** Character index just after the n-th digit of `text` (0 → start). */
function caretAfterDigits(text, n) {
  if (n <= 0) return text.startsWith('+') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) {
      seen += 1;
      if (seen === n) return i + 1;
    }
  }
  return text.length;
}

export default function PhoneInput({
  value = '',
  onChange,
  variant = 'prompt',
  id,
  label = 'Mobile number',
  invalid = false,
  autoFocus = false,
  onEnter,
  detect = true,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.prompt;
  const autoId = useId();
  const inputId = id ?? `phone-${autoId}`;
  const listId = `${inputId}-countries`;

  const [country, setCountry] = useState(() => splitE164(value)?.country ?? defaultPhoneCountry(value));
  const [text, setText] = useState(() => splitE164(value)?.national ?? '');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const caretRef = useRef(null);
  // Once the person picks a country or types, the IP lookup must not move it.
  const touchedRef = useRef(false);

  // `value` is the last prop we handled; `emitted` the last E.164 we reported.
  // A new `value` equal to `emitted` is just our own echo coming back;
  // anything else (settings finished loading, a reset) is a real outside
  // change and re-seeds the field. Done during render, React's pattern for
  // state derived from a prop, so there is no extra paint with stale text.
  const [seen, setSeen] = useState(value);
  const [emitted, setEmitted] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== emitted) {
      setEmitted(value);
      const parts = splitE164(value);
      if (parts) {
        if (parts.country) setCountry(parts.country);
        setText(parts.national);
      } else if (!value) {
        setText('');
      }
    }
  }

  // The sync guess (cache / timezone / language) is already in place; the IP
  // lookup can still correct it for someone on a travel laptop, as long as
  // there is no stored number and they haven't started on the field.
  const hasValue = Boolean(value);
  useEffect(() => {
    if (!detect || hasValue || touchedRef.current) return undefined;
    let live = true;
    detectCountry()
      .then((c) => {
        if (live && !touchedRef.current && isSupportedCountry(c)) setCountry(c);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [detect, hasValue]);

  // Put the caret back where it was relative to the DIGITS, after formatting
  // inserted spaces/brackets around it. Without this every keystroke in the
  // middle of a number throws the caret to the end.
  useLayoutEffect(() => {
    const pos = caretRef.current;
    caretRef.current = null;
    const el = inputRef.current;
    if (pos == null || !el || document.activeElement !== el) return;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* input type without selection support */
    }
  }, [text]);

  const emit = (nextText, nextCountry) => {
    const e164 = toE164(nextText, nextCountry);
    setEmitted(e164);
    onChange?.(e164, { valid: isValidE164(e164), empty: !digitsOf(nextText), country: nextCountry });
  };

  const onType = (e) => {
    touchedRef.current = true;
    let raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    let digitsBefore = digitsOf(raw.slice(0, caret)).length;

    // Backspace over a space or bracket deletes no digit, so reformatting
    // would put the same character straight back and the key would look
    // dead. Treat it as deleting the digit before it, like a plain field.
    if (raw.length < text.length && digitsOf(raw) === digitsOf(text) && digitsBefore > 0) {
      const d = digitsOf(raw);
      raw = `${raw.trim().startsWith('+') ? '+' : ''}${d.slice(0, digitsBefore - 1)}${d.slice(digitsBefore)}`;
      digitsBefore -= 1;
    }

    const next = formatTyped(raw, country);
    if (next.country) {
      // A full international number was pasted/autofilled: move the picker
      // to its country and leave the caret at the end of the national part.
      setCountry(next.country);
      caretRef.current = next.text.length;
    } else {
      caretRef.current = caretAfterDigits(next.text, digitsBefore);
    }
    setText(next.text);
    emit(next.text, next.country ?? country);
  };

  const options = countryOptions();
  const matches = useMemo(() => searchCountries(query, options), [query, options]);

  const openPicker = () => {
    setQuery('');
    const at = options.findIndex((o) => o.code === country);
    setActive(Math.max(0, at));
    setOpen(true);
  };

  const closePicker = (refocus) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (code) => {
    touchedRef.current = true;
    setCountry(code);
    setOpen(false);
    // Re-read what's typed against the new country: "07400 123456" means a
    // different number in GB than in IN. An international "+…" text keeps its
    // own code.
    const next = text.trim().startsWith('+') ? { text } : formatTyped(text, code);
    setText(next.text);
    emit(next.text, code);
    inputRef.current?.focus();
  };

  // Close on a click anywhere outside the field + picker.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active].code);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePicker(true);
    }
  };

  const countryName = options.find((o) => o.code === country)?.name ?? country;
  const placeholder = examplePlaceholder(country);

  return (
    <div ref={rootRef} className="w-full min-w-0">
      <div
        className="flex min-w-0 items-stretch overflow-hidden border transition-colors"
        style={{
          borderRadius: v.radius,
          backgroundColor: v.bg,
          borderColor: invalid ? 'var(--red-solid, var(--red))' : open ? v.accent : v.border,
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (open ? closePicker(false) : openPicker())}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`Country code: ${countryName} ${dialCodeOf(country)}. Change country`}
          className="flex shrink-0 select-none items-center gap-1.5 border-r px-3"
          style={{ borderColor: v.line, backgroundColor: v.selectorBg, color: v.selectorText, lineHeight: 1, ...v.selectorFont }}
        >
          <span aria-hidden className="text-[17px] leading-none">{flagOf(country)}</span>
          <span className="tabular-nums">{dialCodeOf(country)}</span>
          <svg aria-hidden className="h-3 w-3 opacity-60" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-label={label}
          aria-invalid={invalid || undefined}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          onChange={onType}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
          }}
          className={`w-full min-w-0 flex-1 bg-transparent outline-none ${v.inputClass}`}
          style={{ color: v.text }}
        />
      </div>

      {open && (
        <div
          className="mt-1.5 overflow-hidden border"
          style={{ borderRadius: v.radius, borderColor: v.line, backgroundColor: v.panelBg, boxShadow: 'var(--shadow-card, 0 8px 24px rgba(0,0,0,.25))' }}
        >
          <input
            type="text"
            role="combobox"
            aria-label="Search countries"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={matches[active] ? `${listId}-${matches[active].code}` : undefined}
            autoFocus
            placeholder="Search country or code"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onSearchKey}
            className="w-full border-b bg-transparent px-3 py-2.5 text-[16px] outline-none sm:text-[13px]"
            style={{ borderColor: v.line, color: v.text }}
          />
          <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className="max-h-[220px] overflow-y-auto overscroll-contain py-1">
            {matches.length === 0 && (
              <li className="px-3 py-2.5 text-[13px]" style={{ color: v.muted }}>No country matches “{query}”</li>
            )}
            {matches.map((o, i) => (
              <li
                key={o.code}
                id={`${listId}-${o.code}`}
                role="option"
                aria-selected={o.code === country}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault() /* keep focus in the search box */}
                onClick={() => choose(o.code)}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px]"
                style={{ backgroundColor: i === active ? v.hover : 'transparent', color: v.text }}
              >
                <span aria-hidden className="text-[16px] leading-none">{o.flag}</span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                <span className="shrink-0 tabular-nums" style={{ color: v.muted }}>{o.dial}</span>
                {o.code === country && (
                  <svg aria-hidden className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={v.accent} strokeWidth="2.6" strokeLinecap="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
