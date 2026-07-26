import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';
import { fetchNotificationSettings, updateNotificationSettings } from '../../api/notificationsApi';

/**
 * First-time mobile-number prompt.
 *
 * Shows once, the first time a signed-in user lands on the dashboard without a
 * phone on file. "Once" is enforced server-side via profiles.phone_prompted_at
 * (set on submit AND on dismiss), so it survives refreshes and doesn't re-nag on
 * a second device — a localStorage flag would fail both. We still keep a
 * per-session guard so it can't flash twice within one page life.
 *
 * It is intentionally skippable ("Maybe later"): a hard gate on a phone number
 * right after signup is a great way to lose a just-activated user.
 *
 * The dialog UI (PhonePromptDialog) is a pure presentational component so it can
 * be previewed and styled in isolation; PhonePrompt is the data/gating shell.
 */

/** Just the digits, capped at a 10-digit Indian mobile. */
function digitsOf(raw) {
  return raw.replace(/[^\d]/g, '').slice(0, 10);
}
/** Group as "98765 43210" for readability while typing. */
function formatIn(raw) {
  const d = digitsOf(raw);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
function isComplete(raw) {
  return digitsOf(raw).length === 10;
}

/* ───────────────────────── presentational dialog ───────────────────────── */

export function PhonePromptDialog({ phone, onPhoneChange, optIn, onOptInChange, error, saving, onSave, onDismiss }) {
  const complete = isComplete(phone);
  const reduce = useReducedMotion();

  // A phone "buzz": a quick shake burst, then a pause, on a loop. Held still for
  // reduced-motion users.
  const buzz = reduce
    ? {}
    : {
        rotate: [0, -7, 7, -7, 7, -4, 4, 0],
        x: [0, -1.5, 1.5, -1.5, 1.5, -1, 1, 0],
        transition: { duration: 0.55, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 },
      };

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* scrim — click to dismiss (counts as "maybe later") */}
      <button type="button" aria-label="Close" onClick={onDismiss} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-prompt-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--dash-surface, #0d0f14)',
          borderColor: 'var(--dash-border, rgba(255,255,255,0.1))',
        }}
      >
        {/* accent header band with the live alert preview */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(0,212,170,0.14), transparent 70%)' }}
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* a vibrating mobile icon with a live "ping" dot — signals phone alerts */}
          <motion.div
            className="relative mx-auto flex h-16 w-16 items-center justify-center"
            animate={buzz}
            style={{ transformOrigin: 'center' }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(0,212,170,0.14)', border: '1px solid rgba(0,212,170,0.25)' }}
            >
              <svg className="h-8 w-8" fill="none" stroke="#00d4aa" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden>
                <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
                <path strokeLinecap="round" d="M10.5 18.5h3" />
              </svg>
              {/* notification dot, animated */}
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: '#00d4aa' }} />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-surface-950" style={{ backgroundColor: '#00d4aa' }}>1</span>
              </span>
            </div>
            {/* buzz waves — two arcs that pulse out as the phone shakes */}
            {!reduce && (
              <>
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute h-20 w-20 rounded-full border"
                  style={{ borderColor: 'rgba(0,212,170,0.35)' }}
                  animate={{ scale: [0.8, 1.15], opacity: [0.5, 0] }}
                  transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.1 }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute h-24 w-24 rounded-full border"
                  style={{ borderColor: 'rgba(0,212,170,0.22)' }}
                  animate={{ scale: [0.8, 1.2], opacity: [0.35, 0] }}
                  transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.1, delay: 0.15 }}
                />
              </>
            )}
          </motion.div>
        </div>

        <div className="px-6 pb-6 pt-1 sm:px-7">
          <h2 id="phone-prompt-title" className="font-display text-[22px] font-bold leading-tight" style={{ color: 'var(--dash-text-primary, #fff)' }}>
            Get alerts on your phone
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: 'var(--dash-text-muted, #94a3b8)' }}>
            We&rsquo;ll message you the instant a rule breaks — even when you&rsquo;re away from the screen. No screen-watching required.
          </p>

          {/* phone input with a locked +91 prefix so they type only 10 digits */}
          <div
            className="mt-5 flex items-stretch overflow-hidden rounded-xl border transition-colors focus-within:border-accent"
            style={{
              backgroundColor: 'var(--dash-input-bg, rgba(255,255,255,0.04))',
              borderColor: error ? '#ef4444' : 'var(--dash-border, rgba(255,255,255,0.12))',
            }}
          >
            <span
              className="flex select-none items-center gap-1.5 border-r px-3.5 text-[15px] font-semibold"
              style={{ borderColor: 'var(--dash-border, rgba(255,255,255,0.1))', color: 'var(--dash-text-secondary, #cbd5e1)' }}
            >
              <span aria-hidden>🇮🇳</span> +91
            </span>
            <input
              id="phone-prompt-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              placeholder="98765 43210"
              value={formatIn(phone)}
              onChange={(e) => onPhoneChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && complete) onSave(); }}
              className="w-full bg-transparent px-3.5 py-3 text-[16px] tracking-wide outline-none"
              style={{ color: 'var(--dash-text-primary, #fff)' }}
            />
          </div>
          {error && <p className="mt-1.5 text-[13px] text-red-400">{error}</p>}

          {/* opt-in — the whole row is the toggle, highlights when on */}
          <button
            type="button"
            onClick={() => onOptInChange(!optIn)}
            className="mt-3 flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors"
            style={{
              borderColor: optIn ? 'rgba(0,212,170,0.4)' : 'var(--dash-border, rgba(255,255,255,0.1))',
              backgroundColor: optIn ? 'rgba(0,212,170,0.06)' : 'transparent',
            }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
              style={{
                borderColor: optIn ? '#00d4aa' : 'var(--dash-border, rgba(255,255,255,0.25))',
                backgroundColor: optIn ? '#00d4aa' : 'transparent',
              }}
            >
              {optIn && (
                <svg className="h-3 w-3" fill="none" stroke="#04120e" strokeWidth="3.5" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-[13.5px] leading-snug" style={{ color: 'var(--dash-text-secondary, #cbd5e1)' }}>
              Send me risk alerts on this number
              <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--dash-text-muted, #94a3b8)' }}>
                Only breach and kill-switch alerts. No marketing.
              </span>
            </span>
          </button>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              disabled={saving}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ color: 'var(--dash-text-muted, #94a3b8)' }}
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !complete}
              className="flex-1 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-surface-950 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {saving ? 'Saving…' : 'Save & get alerts'}
            </button>
          </div>

          <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[11.5px]" style={{ color: 'var(--dash-text-muted, #94a3b8)' }}>
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            We never call you or share your number.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── data + gating shell ───────────────────────── */

export default function PhonePrompt() {
  const { user, session } = useAuth();
  const toast = useToast();
  const token = session?.access_token ?? null;

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const decidedRef = useRef(false); // per-session guard against a double-check

  // Decide whether to show it: one settings read once we have a session.
  useEffect(() => {
    if (!token || !user || decidedRef.current) return undefined;
    const controller = new AbortController();

    (async () => {
      try {
        const settings = await fetchNotificationSettings({ accessToken: token, signal: controller.signal });
        if (controller.signal.aborted) return;
        // Show only if they've never given a number AND we've never asked.
        if (settings && !settings.phone && !settings.phonePrompted) {
          decidedRef.current = true;
          setOpen(true);
        }
      } catch {
        // Non-blocking: if the check fails we just don't prompt this load.
      }
    })();

    return () => controller.abort();
  }, [token, user]);

  // Mark the prompt as shown so it never returns, whichever way it closes.
  const markPrompted = async () => {
    try {
      await updateNotificationSettings({ accessToken: token, markPhonePrompted: true });
    } catch {
      // Best-effort; the per-session guard keeps it from re-flashing meanwhile.
    }
  };

  const dismiss = () => {
    if (saving) return;
    setOpen(false);
    void markPrompted();
  };

  const onPhoneChange = (raw) => {
    setPhone(digitsOf(raw));
    if (error) setError('');
  };

  const save = async () => {
    if (!isComplete(phone)) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateNotificationSettings({
        accessToken: token,
        phone: `+91${digitsOf(phone)}`,
        mobileNotificationsEnabled: optIn,
        markPhonePrompted: true,
      });
      setOpen(false);
      toast.success('Number saved', optIn ? 'Mobile alerts are on.' : 'You can turn on mobile alerts anytime in Settings.');
    } catch (e) {
      setError(e?.message?.includes('valid') ? 'Enter a valid mobile number.' : 'Could not save. Try again.');
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <PhonePromptDialog
          phone={phone}
          onPhoneChange={onPhoneChange}
          optIn={optIn}
          onOptInChange={setOptIn}
          error={error}
          saving={saving}
          onSave={save}
          onDismiss={dismiss}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
