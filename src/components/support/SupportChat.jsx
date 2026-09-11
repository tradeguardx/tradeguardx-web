import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { sendSupportMessage, SUGGESTED_QUESTIONS } from '../../api/supportApi';

/**
 * Floating support assistant, mounted once in DashboardLayout.
 *
 * It answers from the selected account's real state and enforcement events,
 * so every question is scoped to `selectedAccount`. The panel is keyed on the
 * account id, so switching accounts remounts it — an answer about account A
 * can never carry into account B.
 *
 * Deliberately read-only. It has no buttons that change rules or keys; the
 * assistant explains where those controls are and why some changes are
 * delayed. Someone tilting at 2am asking a chat box to lift their lockout
 * must get an explanation, not a lever.
 */

const STORAGE_KEY = 'tgx_support_open';

/**
 * Client-side ceiling. The Lambda is capped at 29s and API Gateway at ~30s;
 * when they time out the browser sees a response with no CORS headers and
 * reports the useless "Failed to fetch". Aborting a second earlier lets us
 * say what actually happened.
 */
const REQUEST_TIMEOUT_MS = 28_000;

function useSessionFlag(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const s = sessionStorage.getItem(key);
      return s === null ? initial : s === '1';
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next) => {
      setV(next);
      try {
        sessionStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [v, set];
}

/* ─── Markdown (the small subset the assistant is told to use) ──────────── */

/**
 * Inline: **bold** and `code`. Tolerant of an unbalanced marker — a reply cut
 * off after "**XRPUSD (" previously rendered the asterisks literally. An
 * unmatched opener is now shown as plain text without the marker.
 */
function inline(text) {
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

function renderReply(text) {
  const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return null;

    const bullet = /^\s*(?:[-*•]|\d+[.)])\s+/;
    if (lines.every((l) => bullet.test(l))) {
      const ordered = /^\s*\d+[.)]\s+/.test(lines[0]);
      const Tag = ordered ? 'ol' : 'ul';
      return (
        <Tag key={bi} className={`my-2 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {lines.map((l, li) => (
            <li key={li} className="leading-relaxed">{inline(l.replace(bullet, ''))}</li>
          ))}
        </Tag>
      );
    }

    // headings are discouraged in the prompt; render one plainly if it slips through
    const heading = /^#{1,3}\s+(.*)$/.exec(lines[0]);
    if (heading) {
      return (
        <div key={bi} className="my-2">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
            {heading[1]}
          </p>
          {lines.length > 1 && <p className="leading-relaxed">{inline(lines.slice(1).join(' '))}</p>}
        </div>
      );
    }

    return (
      <p key={bi} className="my-2 leading-relaxed first:mt-0 last:mb-0">
        {inline(lines.join(' '))}
      </p>
    );
  });
}

/* ─── UI ───────────────────────────────────────────────────────────────── */

function Avatar() {
  return (
    <div
      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: 'linear-gradient(135deg, #00d4aa, #10b981)' }}
      aria-hidden
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#04121a" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
      </svg>
    </div>
  );
}

function timeLabel(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function SupportChat() {
  const { session } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  if (!session) return null;
  return (
    <SupportChatPanel key={selectedAccount?.id ?? 'none'} session={session} selectedAccount={selectedAccount} />
  );
}

function SupportChatPanel({ session, selectedAccount }) {
  const [open, setOpen] = useSessionFlag(STORAGE_KEY, false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastFailed, setLastFailed] = useState('');
  const [suggested, setSuggested] = useState(SUGGESTED_QUESTIONS);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const accountId = selectedAccount?.id ?? null;
  const accountName = selectedAccount?.name || selectedAccount?.propFirmSlug || 'selected';

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function ask(text) {
    const content = text.trim();
    if (!content || busy) return;
    if (!session?.access_token || !accountId) {
      setError('Select a trading account first.');
      return;
    }
    // `ask` is only ever invoked from click/submit handlers, so this is the
    // send time, not a render-time read. The compiler lint cannot see that
    // from a function declared in the component body.
    // eslint-disable-next-line react-hooks/purity
    const next = [...messages, { role: 'user', content, at: Date.now() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    setLastFailed('');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort('timeout'), REQUEST_TIMEOUT_MS);

    try {
      const res = await sendSupportMessage({
        accessToken: session.access_token,
        tradingAccountId: accountId,
        messages: next.map(({ role, content: c }) => ({ role, content: c })),
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setMessages((m) => [...m, { role: 'assistant', content: res?.reply || '…', at: Date.now() }]);
      if (Array.isArray(res?.suggested) && res.suggested.length) setSuggested(res.suggested);
    } catch (e) {
      const timedOut = ctrl.signal.aborted && ctrl.signal.reason === 'timeout';
      if (ctrl.signal.aborted && !timedOut) return; // superseded by a newer question
      const status = e?.status;
      setError(
        timedOut
          ? 'That took too long to answer. Try a shorter question, or ask again.'
          : status === 503
            ? 'The assistant is temporarily unavailable. Try again in a moment.'
            : e?.details?.error?.message || e?.message || 'Something went wrong.',
      );
      setLastFailed(content);
      setMessages(messages); // drop the unanswered turn; the retry button resends it
    } finally {
      clearTimeout(timer);
      if (!ctrl.signal.aborted || ctrl.signal.reason === 'timeout') setBusy(false);
    }
  }

  const bubbleAssistant = {
    backgroundColor: 'var(--dash-bg-card)',
    border: '1px solid var(--dash-border)',
    color: 'var(--dash-text-secondary)',
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close support assistant' : 'Open support assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c', boxShadow: '0 8px 28px rgba(0,212,170,0.35)' }}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z" /></svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="TradeGuardX assistant"
          className="fixed bottom-20 right-5 z-[60] flex w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border"
          style={{
            height: 'min(72vh, 600px)',
            backgroundColor: 'var(--dash-bg-raised)',
            borderColor: 'var(--dash-border)',
            boxShadow: '0 24px 64px -16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.16), rgba(16,185,129,0.06))', borderBottom: '1px solid var(--dash-border)' }}
          >
            <Avatar />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight" style={{ color: 'var(--dash-text-primary)' }}>TradeGuardX Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accountId ? '#00d4aa' : 'var(--dash-text-faint)' }} />
                {accountId ? `Answers from your ${accountName} account` : 'Select an account to begin'}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => { setMessages([]); setError(''); setLastFailed(''); }}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors"
                style={{ color: 'var(--dash-text-muted)' }}
                title="Start a new conversation"
              >
                New chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
            {messages.length === 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--dash-text-primary)' }}>Hi there 👋</p>
                  <p className="mt-0.5">Ask me why something happened on your account, or how any part of TradeGuardX works.</p>
                </div>
                <div className="space-y-2 pt-1">
                  {suggested.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => ask(q)}
                      disabled={!accountId}
                      className="group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-all hover:translate-x-0.5 disabled:opacity-50"
                      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-primary)' }}
                    >
                      <span>{q}</span>
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--dash-text-faint)' }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex flex-col items-end gap-1">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed" style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                    <span className="pr-1 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{timeLabel(m.at)}</span>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2.5">
                    <Avatar />
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="max-w-full rounded-2xl rounded-tl-md px-3.5 py-2.5" style={bubbleAssistant}>
                        {renderReply(m.content)}
                      </div>
                      <span className="pl-1 text-[10px]" style={{ color: 'var(--dash-text-faint)' }}>{timeLabel(m.at)}</span>
                    </div>
                  </div>
                ),
              )}

              {busy && (
                <div className="flex items-start gap-2.5">
                  <Avatar />
                  <div className="rounded-2xl rounded-tl-md px-3.5 py-3" style={bubbleAssistant}>
                    <span className="inline-flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ backgroundColor: 'var(--tax-neg-soft)', color: 'var(--tax-neg)' }}>
                  <p>{error}</p>
                  {lastFailed && (
                    <button type="button" onClick={() => ask(lastFailed)} className="mt-1.5 font-semibold underline underline-offset-2">
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-center gap-2 px-3 py-3"
            style={{ borderTop: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={accountId ? 'Ask about your account…' : 'Select an account first'}
              disabled={busy || !accountId}
              className="flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-[color:var(--accent,#00d4aa)]"
              style={{ backgroundColor: 'var(--dash-bg-input)', borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || !accountId}
              aria-label="Send"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-4 7 4 7-14-7z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
