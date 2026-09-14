import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { sendSupportMessage, SUGGESTED_QUESTIONS } from '../../api/supportApi';
import { submitSupportRequest, supportFormConfigured } from '../../api/supportRequestApi';
import { CHAT_THEMES, useChatTheme } from './chatThemes';
import { renderReply } from './supportMarkdown';
import { OPEN_SUPPORT_EVENT } from './supportBus';

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
function ContactSupportView({ session, selectedAccount, transcript, onBack, onSent, prefill = '', theme }) {
  const [message, setMessage] = useState(prefill);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';

  async function submit(e) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await submitSupportRequest({
        accessToken: session?.access_token,
        accountId: selectedAccount?.id || '',
        message: message.trim(),
        name,
        accountName: selectedAccount?.name || selectedAccount?.propFirmSlug || '',
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
        <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Explain the issue</p>
        <p className="mt-0.5" style={{ color: 'var(--dash-text-secondary)' }}>
          Tell us what went wrong. Your query will be resolved within 30 minutes.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue — what you expected, what happened, and when."
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
          style={{ background: theme.userGradient, color: theme.userText }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}

/* ─── UI ───────────────────────────────────────────────────────────────── */

function Avatar({ gradient = 'linear-gradient(135deg, #00d4aa, #10b981)', text = '#05221c' }) {
  return (
    <div
      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
      style={{ background: gradient, color: text }}
      aria-hidden
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#04121a" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
      </svg>
    </div>
  );
}

/**
 * Icons and grouping for the suggested questions. Keyed by text so the
 * server can reorder or replace the list without the UI losing its icons —
 * an unknown question just gets the default glyph.
 */
const SUGGESTION_META = {
  'Why was my last trade closed?': { group: 'about', icon: 'M6 18L18 6M6 6l12 12' },
  'Why is my account locked?': { group: 'about', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  'Why does it say Unprotected?': { group: 'about', icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z' },
  'What rules do I have turned on?': { group: 'about', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  'How do I connect my Delta API key?': { group: 'howto', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
};
const DEFAULT_ICON = 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';

function SuggestionRow({ text, onPick, disabled, index, theme }) {
  const meta = SUGGESTION_META[text] ?? { icon: DEFAULT_ICON };
  return (
    <motion.button
      type="button"
      onClick={() => onPick(text)}
      disabled={disabled}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.25 }}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors disabled:opacity-50"
      style={{ color: theme.assistantText }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.accentSoft; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
        </svg>
      </span>
      <span className="flex-1">{text}</span>
      <span aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--dash-text-faint)' }}>→</span>
    </motion.button>
  );
}

/**
 * Wallpaper picker. Swatches, not names — the eye chooses faster than a
 * label, and the live panel behind the popover is the preview.
 */
function ThemePicker({ theme, onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat theme"
        aria-expanded={open}
        title="Chat theme"
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ color: 'var(--dash-text-muted)' }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.8 1.8-1.8H16a5 5 0 005-5c0-4-4-7-9-7z" />
          <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 z-10 w-44 rounded-2xl p-2"
            style={{ backgroundColor: 'var(--dash-bg-raised)', boxShadow: '0 16px 40px -12px rgba(0,0,0,0.35), 0 0 0 1px var(--dash-border)' }}
          >
            <p className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--dash-text-faint)' }}>Wallpaper</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CHAT_THEMES.map((t) => {
                const active = t.id === theme.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { onPick(t.id); setOpen(false); }}
                    title={t.name}
                    aria-label={`${t.name} theme`}
                    aria-pressed={active}
                    className="flex flex-col items-center gap-1 rounded-xl p-1.5"
                    style={{ backgroundColor: active ? 'var(--dash-bg-card)' : 'transparent' }}
                  >
                    <span
                      className="h-8 w-8 rounded-full"
                      style={{ background: t.swatch, boxShadow: active ? `0 0 0 2px var(--dash-bg-raised), 0 0 0 4px ${t.accent}` : '0 0 0 1px var(--dash-border)' }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: active ? 'var(--dash-text-primary)' : 'var(--dash-text-muted)' }}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [contactPrefill, setContactPrefill] = useState('');

  useEffect(() => {
    const onOpen = (e) => {
      setContactPrefill(e?.detail?.prefill || '');
      setView('contact');
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, [setOpen]);
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

  const [theme, setTheme] = useChatTheme();
  const [composerFocus, setComposerFocus] = useState(false);
  const bubbleAssistant = {
    backgroundColor: theme.assistantBg,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    color: theme.assistantText,
  };
  const userGradient = { background: theme.userGradient, color: theme.userText };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close support assistant' : 'Open support assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-13 w-13 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52, background: theme.userGradient, color: theme.userText, boxShadow: `0 10px 30px -6px ${theme.accent}88, 0 0 0 4px ${theme.accentSoft}` }}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z" /></svg>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="TradeGuardX assistant"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed bottom-20 right-5 z-[60] flex w-[min(92vw,400px)] origin-bottom-right flex-col overflow-hidden rounded-3xl"
          style={{
            height: 'min(72vh, 620px)',
            backgroundColor: 'var(--dash-bg-raised)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.35), 0 0 0 1px var(--dash-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{
              background: `linear-gradient(135deg, ${theme.accentSoft} 0%, transparent 70%)`,
              borderBottom: '1px solid var(--dash-border)',
            }}
          >
            <Avatar gradient={theme.userGradient} text={theme.userText} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight" style={{ color: 'var(--dash-text-primary)' }}>TradeGuardX Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--dash-text-muted)' }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accountId ? theme.accent : 'var(--dash-text-faint)' }} />
                {accountId ? `Answers from your ${accountName} account` : 'Select an account to begin'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {view === 'chat' && <ThemePicker theme={theme} onPick={setTheme} />}
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
                  style={{ borderColor: `${theme.accent}59`, color: theme.accent, backgroundColor: theme.accentSoft }}
                >
                  Contact support
                </button>
              )}
            </div>
          </div>

          {view === 'contact' && (
            <ContactSupportView
              key={contactPrefill}
              session={session}
              selectedAccount={selectedAccount}
              transcript={messages.map(({ role, content }) => ({ role, content }))}
              prefill={contactPrefill}
              theme={theme}
              onBack={() => { setContactPrefill(''); setView('chat'); }}
              onSent={() => { setContactPrefill(''); setView('sent'); }}
            />
          )}

          {view === 'sent' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: theme.accentSoft }}>
                <svg className="h-6 w-6" fill="none" stroke={theme.accent} strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--dash-text-primary)' }}>Received</p>
              <p className="text-[13px]" style={{ color: 'var(--dash-text-secondary)' }}>
                Your query will be resolved within 30 minutes. We'll reply by email.
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
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-4 text-[13px]"
            style={{
              color: theme.assistantText,
              background: theme.pattern ? `${theme.pattern}, ${theme.wall}` : theme.wall,
              // Both layers scroll with the content — a fixed wallpaper
              // inside a transformed (framer) panel renders wrong.
              backgroundAttachment: 'scroll',
            }}
          >
            {messages.length === 0 && (
              <div className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <p className="text-xl font-bold tracking-tight" style={{ color: theme.heading }}>Hi there 👋</p>
                  <p className="mt-1 leading-relaxed">
                    I can see this account's rules and everything the kill switch has done. Ask me why something happened, or how any part of TradeGuardX works.
                  </p>
                </motion.div>

                {[
                  { key: 'about', label: 'About your account' },
                  { key: 'howto', label: 'How do I…' },
                ].map((g) => {
                  const items = suggested.filter((q) => (SUGGESTION_META[q]?.group ?? 'about') === g.key);
                  if (!items.length) return null;
                  return (
                    <div key={g.key}>
                      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.meta }}>
                        {g.label}
                      </p>
                      <div
                        className="rounded-2xl p-1"
                        style={{ backgroundColor: theme.assistantBg, boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }}
                      >
                        {items.map((q, i) => (
                          <SuggestionRow key={q} text={q} index={i} onPick={ask} disabled={!accountId} theme={theme} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                <p className="px-1 text-[11px] leading-relaxed" style={{ color: theme.meta }}>
                  I explain, I don't change anything — rules, locks and keys are yours to edit in the dashboard.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-col items-end gap-1">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed" style={{ ...userGradient, boxShadow: `0 4px 14px -6px ${theme.accent}80` }}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                    <span className="pr-1 text-[10px]" style={{ color: theme.meta }}>{timeLabel(m.at)}</span>
                  </motion.div>
                ) : (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-start gap-2.5">
                    <Avatar gradient={theme.userGradient} text={theme.userText} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="max-w-full rounded-2xl rounded-tl-md px-4 py-3 text-[13.5px]" style={bubbleAssistant}>
                        {renderReply(m.content)}
                      </div>
                      <span className="pl-1 text-[10px]" style={{ color: theme.meta }}>{timeLabel(m.at)}</span>
                    </div>
                  </motion.div>
                ),
              )}

              {busy && (
                <div className="flex items-start gap-2.5">
                  <Avatar gradient={theme.userGradient} text={theme.userText} />
                  <div className="rounded-2xl rounded-tl-md px-3.5 py-3" style={bubbleAssistant}>
                    <span className="inline-flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ backgroundColor: theme.meta }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]" style={{ backgroundColor: theme.meta }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]" style={{ backgroundColor: theme.meta }} />
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
                <p className="pl-9 text-[11px]" style={{ color: theme.meta }}>
                  Not what you needed?{' '}
                  <button type="button" onClick={() => setView('contact')} className="font-semibold underline underline-offset-2" style={{ color: theme.meta }}>
                    Raise an issue
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
            className="px-3 pb-3 pt-2"
            style={{ borderTop: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
          >
            <div
              className="flex items-center gap-1.5 rounded-full py-1 pl-4 pr-1 transition-shadow"
              style={{ backgroundColor: 'var(--dash-bg-input)', boxShadow: `0 0 0 1px ${composerFocus ? theme.accent : 'var(--dash-border)'}` }}
            >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={accountId ? 'Ask about your account…' : 'Select an account first'}
              disabled={busy || !accountId}
              className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none"
              style={{ color: 'var(--dash-text-primary)' }}
              onFocus={() => setComposerFocus(true)}
              onBlur={() => setComposerFocus(false)}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || !accountId}
              aria-label="Send"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={userGradient}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-4 7 4 7-14-7z" /></svg>
            </button>
            </div>
          </form>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
