import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { sendSupportMessage, SUGGESTED_QUESTIONS } from '../../api/supportApi';
import { submitSupportRequest, supportFormConfigured } from '../../api/supportRequestApi';
import { renderReply } from './supportMarkdown';

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

/**
 * Handoff to a human. Lives INSIDE the chat panel so the user never has to
 * leave the conversation to reach the founder, and the recent transcript
 * travels with the request — what they tried and what the bot told them.
 */
function ContactSupportView({ session, selectedAccount, transcript, onBack, onSent }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const email = session?.user?.email || '';
  const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';

  async function submit(e) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await submitSupportRequest({
        email,
        name,
        message: message.trim(),
        accountName: selectedAccount?.name || selectedAccount?.propFirmSlug || '',
        accountId: selectedAccount?.id || '',
        transcript,
      });
      onSent();
    } catch (err) {
      setError(err?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-[13px]">
      <div>
        <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Message the founder</p>
        <p className="mt-0.5" style={{ color: 'var(--dash-text-secondary)' }}>
          Goes straight to Prashant. Reply lands at <span className="font-medium" style={{ color: 'var(--dash-text-primary)' }}>{email}</span>.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's going on? Include anything the assistant couldn't answer."
        rows={6}
        maxLength={4000}
        autoFocus
        className="w-full resize-none rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed outline-none focus:border-[color:var(--accent,#00d4aa)]"
        style={{ backgroundColor: 'var(--dash-bg-input)', borderColor: 'var(--dash-border)', color: 'var(--dash-text-primary)' }}
      />

      {transcript.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>
          Your last {Math.min(transcript.length, 8)} chat messages and the account name are attached so you don't have to repeat yourself.
        </p>
      )}

      {error && (
        <p className="rounded-xl px-3 py-2 text-[12px]" style={{ backgroundColor: 'var(--tax-neg-soft)', color: 'var(--tax-neg)' }}>{error}</p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold"
          style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] font-bold disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent, #00d4aa)', color: '#05221c' }}
        >
          {sending ? 'Sending…' : 'Send to founder'}
        </button>
      </div>
    </form>
  );
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
  const [view, setView] = useState('chat'); // 'chat' | 'contact' | 'sent'
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
    boxShadow: 'var(--dash-shadow-inset-top), 0 1px 0 0 var(--dash-border)',
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
            <div className="flex items-center gap-1">
              {messages.length > 0 && view === 'chat' && (
                <button
                  type="button"
                  onClick={() => { setMessages([]); setError(''); setLastFailed(''); }}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                  style={{ color: 'var(--dash-text-muted)' }}
                  title="Start a new conversation"
                >
                  New chat
                </button>
              )}
              {supportFormConfigured() && view === 'chat' && (
                <button
                  type="button"
                  onClick={() => setView('contact')}
                  className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
                  style={{ borderColor: 'rgba(0,212,170,0.35)', color: 'var(--accent, #00d4aa)', backgroundColor: 'rgba(0,212,170,0.08)' }}
                >
                  Contact support
                </button>
              )}
            </div>
          </div>

          {view === 'contact' && (
            <ContactSupportView
              session={session}
              selectedAccount={selectedAccount}
              transcript={messages.map(({ role, content }) => ({ role, content }))}
              onBack={() => setView('chat')}
              onSent={() => setView('sent')}
            />
          )}

          {view === 'sent' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,212,170,0.14)' }}>
                <svg className="h-6 w-6" fill="none" stroke="var(--accent, #00d4aa)" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Sent</p>
              <p className="text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
                You'll get a reply at {session?.user?.email}. Usually within a day.
              </p>
              <button
                type="button"
                onClick={() => setView('chat')}
                className="mt-2 rounded-xl px-4 py-2 text-[13px] font-semibold"
                style={{ backgroundColor: 'var(--dash-bg-card)', color: 'var(--dash-text-primary)', border: '1px solid var(--dash-border)' }}
              >
                Back to chat
              </button>
            </div>
          )}

          {/* Messages */}
          {view === 'chat' && (
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
                      <div className="max-w-full rounded-2xl rounded-tl-md px-4 py-3 text-[13.5px]" style={bubbleAssistant}>
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

              {/* After an answer, offer the human route. Kept quiet — a text
                  link, not a button — so it is available without competing
                  with the answer itself. */}
              {!busy && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && supportFormConfigured() && (
                <p className="pl-9 text-[11px]" style={{ color: 'var(--dash-text-faint)' }}>
                  Not what you needed?{' '}
                  <button type="button" onClick={() => setView('contact')} className="font-semibold underline underline-offset-2" style={{ color: 'var(--dash-text-muted)' }}>
                    Message the founder
                  </button>
                </p>
              )}
            </div>
          </div>
          )}

          {/* Composer */}
          {view === 'chat' && (
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
          )}
        </div>
      )}
    </>
  );
}
