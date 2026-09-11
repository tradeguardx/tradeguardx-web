import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { sendSupportMessage, SUGGESTED_QUESTIONS } from '../../api/supportApi';

/**
 * Floating support assistant, mounted once in DashboardLayout.
 *
 * It answers from the selected account's real state and enforcement events,
 * so every question is scoped to `selectedAccount`. Switching accounts resets
 * the conversation — an answer about account A must not carry into account B.
 *
 * Deliberately read-only. It has no buttons that change rules or keys; the
 * assistant explains where those controls are and why some changes are
 * delayed. Someone tilting at 2am asking a chat box to lift their lockout
 * must get an explanation, not a lever.
 */

const STORAGE_KEY = 'tgx_support_open';

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

/** Minimal markdown: paragraphs, **bold**, bullet lines, ### headings. */
function renderReply(text) {
  const blocks = String(text).split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n');
    const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    if (isList) {
      return (
        <ul key={bi} className="my-1.5 list-disc space-y-1 pl-4">
          {lines.map((l, li) => (
            <li key={li}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }
    if (/^#{1,3}\s+/.test(lines[0])) {
      return (
        <p key={bi} className="mt-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--dash-text-faint)' }}>
          {lines[0].replace(/^#{1,3}\s+/, '')}
          {lines.length > 1 && <span className="block normal-case tracking-normal font-normal text-sm" style={{ color: 'var(--dash-text-primary)' }}>{inline(lines.slice(1).join(' '))}</span>}
        </p>
      );
    }
    return (
      <p key={bi} className="my-1.5 leading-relaxed">
        {inline(lines.join(' '))}
      </p>
    );
  });
}

function inline(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function SupportChat() {
  const { session } = useAuth();
  const { selectedAccount } = useTradingAccounts();
  if (!session) return null;
  // A conversation is about ONE account. Keying on the account id remounts the
  // panel on switch, so an answer about account A can never carry into B —
  // and it needs no reset effect to do it.
  return <SupportChatPanel key={selectedAccount?.id ?? 'none'} session={session} selectedAccount={selectedAccount} />;
}

function SupportChatPanel({ session, selectedAccount }) {
  const [open, setOpen] = useSessionFlag(STORAGE_KEY, false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggested, setSuggested] = useState(SUGGESTED_QUESTIONS);
  const listRef = useRef(null);
  const abortRef = useRef(null);

  const accountId = selectedAccount?.id ?? null;

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, busy]);

  async function ask(text) {
    const content = text.trim();
    if (!content || busy) return;
    if (!session?.access_token || !accountId) {
      setError('Select a trading account first.');
      return;
    }
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await sendSupportMessage({
        accessToken: session.access_token,
        tradingAccountId: accountId,
        messages: next,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setMessages((m) => [...m, { role: 'assistant', content: res?.reply || '…' }]);
      if (Array.isArray(res?.suggested) && res.suggested.length) setSuggested(res.suggested);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      // Be specific about the one failure that isn't ours to fix.
      const status = e?.status;
      setError(
        status === 503
          ? 'The assistant is temporarily unavailable. Try again in a moment.'
          : e?.details?.error?.message || e?.message || 'Something went wrong.',
      );
      setMessages(messages); // drop the unanswered turn so it can be resent
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close support assistant' : 'Open support assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
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
          className="fixed bottom-20 right-5 z-[60] flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            height: 'min(70vh, 560px)',
            backgroundColor: 'var(--dash-bg-raised)',
            borderColor: 'var(--dash-border)',
          }}
        >
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.18), rgba(16,185,129,0.10))', borderBottom: '1px solid var(--dash-border)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>TradeGuardX Assistant</p>
            <p className="text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
              {selectedAccount ? `Answers from your ${selectedAccount.name || 'selected'} account` : 'Select an account to begin'}
            </p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
            {messages.length === 0 && (
              <>
                <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Hi there 👋</p>
                <p className="mb-2">Ask me why something happened on your account, or how anything works.</p>
                <div className="space-y-2">
                  {suggested.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => ask(q)}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors"
                      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-primary)' }}
                    >
                      <span>{q}</span>
                      <span aria-hidden style={{ color: 'var(--dash-text-faint)' }}>→</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="max-w-[88%] rounded-2xl px-3.5 py-2"
                  style={
                    m.role === 'user'
                      ? { backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }
                      : { backgroundColor: 'var(--dash-bg-card)', border: '1px solid var(--dash-border)' }
                  }
                >
                  {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : renderReply(m.content)}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3.5 py-2" style={{ backgroundColor: 'var(--dash-bg-card)', border: '1px solid var(--dash-border)' }}>
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]" style={{ backgroundColor: 'var(--dash-text-faint)' }} />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl px-3 py-2 text-[12px]" style={{ backgroundColor: 'var(--tax-neg-soft)', color: 'var(--tax-neg)' }}>
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 px-3 py-3"
            style={{ borderTop: '1px solid var(--dash-border)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your account…"
              disabled={busy || !accountId}
              className="flex-1 rounded-xl border px-3 py-2 text-[13px] outline-none"
              style={{ backgroundColor: 'var(--dash-bg-input)', borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || !accountId}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
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
