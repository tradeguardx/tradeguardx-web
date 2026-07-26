import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';
import {
  createTelegramBindingLink,
  disconnectTelegram,
  fetchNotificationSettings,
  updateNotificationSettings,
} from '../../api/notificationsApi';

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Everything (info, warning, critical)' },
  { value: 'warning', label: 'Warnings + critical only' },
  { value: 'critical', label: 'Critical alerts only' },
];

/** The 10 local digits from a stored E.164 number (e.g. "+919876543210" → "9876543210"). */
function localDigits(e164) {
  if (!e164) return '';
  const d = String(e164).replace(/[^\d]/g, '');
  return d.length > 10 ? d.slice(-10) : d; // drop the country code
}
/** Group 10 digits as "98765 43210" for the input display. */
function formatPhone(digits) {
  const d = digits.replace(/[^\d]/g, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/**
 * Settings panel where users opt into notification channels.
 * Drop this into any dashboard page — it manages its own loading + state.
 */
export default function NotificationSettings() {
  const { session, user } = useAuth();
  const toast = useToast();
  const accessToken = session?.access_token;
  const fallbackEmail = user?.email ?? '';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState(''); // 10 digits, no +91
  const [linking, setLinking] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, onConfirm }

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchNotificationSettings({ accessToken });
      setSettings(result);
      setEmailInput(result?.notificationEmail ?? fallbackEmail);
      // Store 10 local digits for the input; the +91 prefix is shown separately.
      setPhoneInput(localDigits(result?.phone));
    } catch (e) {
      toast.error('Could not load settings', e?.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, toast, fallbackEmail]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!settings?.telegramPending || !accessToken) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [settings?.telegramPending, accessToken, load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const next = await updateNotificationSettings({ accessToken, ...patch });
      setSettings(next);
      toast.success('Saved');
    } catch (e) {
      toast.error('Could not save', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const connectTelegram = async () => {
    setLinking(true);
    try {
      const link = await createTelegramBindingLink({ accessToken });
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
        toast.success('Opening Telegram', 'Press Start in the bot to finish linking.');
        await load();
      }
    } catch (e) {
      toast.error('Could not generate link', e?.message);
    } finally {
      setLinking(false);
    }
  };

  const askDisconnectTelegram = () => {
    setConfirmState({
      title: 'Disconnect Telegram?',
      message: 'You will stop receiving TradeGuardX risk alerts in this chat. You can reconnect any time.',
      confirmLabel: 'Disconnect',
      destructive: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          await disconnectTelegram({ accessToken });
          toast.success('Disconnected', 'Telegram alerts are off.');
          await load();
        } catch (e) {
          toast.error('Could not disconnect', e?.message);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (!accessToken) return null;

  if (loading || !settings) {
    return (
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
        <p className="text-sm" style={{ color: 'var(--dash-text-muted)' }}>Loading notification settings…</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-5 space-y-5"
        style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}
      >
        <div>
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--dash-text-primary)' }}>
            Notifications
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--dash-text-muted)' }}>
            Pick where TradeGuardX should send risk alerts when one of your rules is broken.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dash-text-muted)' }}>
            Send alerts for
          </label>
          <select
            value={settings.notificationMinSeverity}
            onChange={(e) => save({ notificationMinSeverity: e.target.value })}
            disabled={saving}
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
            style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-primary)' }}
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <ChannelRow
          icon={<TelegramIcon />}
          title="Telegram"
          description="Real-time alerts to your Telegram chat. Fastest channel."
          status={
            settings.telegramConnected
              ? 'connected'
              : settings.telegramPending
                ? 'pending'
                : 'not_connected'
          }
          enabled={settings.telegramNotificationsEnabled}
          onToggle={(enabled) => save({ telegramNotificationsEnabled: enabled })}
          canToggle={settings.telegramConnected}
          action={
            settings.telegramConnected ? (
              <button
                type="button"
                onClick={askDisconnectTelegram}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: 'rgba(248,113,113,0.4)', color: 'rgb(248, 113, 113)' }}
              >
                Disconnect
              </button>
            ) : settings.telegramPending ? (
              <span className="text-xs" style={{ color: 'rgb(251, 191, 36)' }}>
                Awaiting Telegram link click…
              </span>
            ) : (
              <button
                type="button"
                onClick={connectTelegram}
                disabled={linking}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50"
              >
                {linking ? 'Generating link…' : 'Connect Telegram'}
              </button>
            )
          }
          saving={saving}
        />

        <ChannelRow
          icon={<EmailIcon />}
          title="Email"
          description="Sent via Resend. Add a delivery address below."
          status={settings.emailNotificationsEnabled ? 'enabled' : 'disabled'}
          enabled={settings.emailNotificationsEnabled}
          onToggle={(enabled) => save({ emailNotificationsEnabled: enabled })}
          canToggle={true}
          saving={saving}
        >
          {settings.emailNotificationsEnabled && (
            <div className="mt-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--dash-text-muted)' }}>
                Delivery email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={fallbackEmail || 'you@example.com'}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40"
                  style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => save({ notificationEmail: emailInput.trim() || null })}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>
                Leave blank to use your account email ({fallbackEmail || 'unset'}).
              </p>
            </div>
          )}
        </ChannelRow>

        <ChannelRow
          icon={<MobileIcon />}
          title="Mobile"
          description="Risk alerts on your phone. Add your number — WhatsApp/SMS delivery is rolling out shortly."
          status={settings.mobileNotificationsEnabled && settings.phone ? 'enabled' : settings.phone ? 'disabled' : 'not_connected'}
          enabled={settings.mobileNotificationsEnabled}
          onToggle={(enabled) => save({ mobileNotificationsEnabled: enabled })}
          canToggle={Boolean(settings.phone)}
          saving={saving}
        >
          <div className="mt-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--dash-text-muted)' }}>
              Mobile number
            </label>
            <div className="flex gap-2">
              <div
                className="flex flex-1 items-stretch overflow-hidden rounded-xl border focus-within:ring-1 focus-within:ring-accent/40"
                style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-input)' }}
              >
                <span
                  className="flex select-none items-center gap-1 border-r px-2.5 text-sm font-semibold"
                  style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                >
                  <span aria-hidden>🇮🇳</span> +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={formatPhone(phoneInput)}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ color: 'var(--dash-text-primary)' }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (phoneInput && phoneInput.length !== 10) {
                    toast.error('Enter a 10-digit mobile number');
                    return;
                  }
                  // Empty input clears the number (and mobile alerts along with it).
                  save(
                    phoneInput
                      ? { phone: `+91${phoneInput}` }
                      : { phone: null, mobileNotificationsEnabled: false },
                  );
                }}
                disabled={saving || phoneInput === localDigits(settings.phone)}
                className="px-3 py-2 rounded-xl text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
              >
                Save
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--dash-text-muted)' }}>
              {settings.phone
                ? 'Saved. Toggle the switch above to turn alerts on this number on or off.'
                : 'Add a number to enable mobile alerts. We never call you or share it.'}
            </p>
          </div>
        </ChannelRow>
      </motion.div>

      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </>
  );
}

function ChannelRow({ icon, title, description, status, enabled, onToggle, canToggle, action, saving, children }) {
  const statusBadge = badgeFor(status);
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-card)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-start gap-3">
          {icon && (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--dash-border)' }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>{title}</span>
              {statusBadge && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ backgroundColor: statusBadge.bg, color: statusBadge.fg }}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--dash-text-secondary)' }}>{description}</p>
            {children}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canToggle && (
            <ToggleSwitch enabled={enabled} onChange={onToggle} disabled={saving} />
          )}
          {action}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
      style={{ backgroundColor: enabled ? 'var(--accent, #00d4aa)' : 'rgba(148, 163, 184, 0.3)' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{ transform: enabled ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

function badgeFor(status) {
  if (status === 'connected' || status === 'enabled') {
    return { label: 'Connected', bg: 'rgba(0, 212, 170, 0.12)', fg: '#00d4aa' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: 'rgba(251, 191, 36, 0.12)', fg: 'rgb(251, 191, 36)' };
  }
  if (status === 'coming_soon') {
    return null;
  }
  if (status === 'not_connected' || status === 'disabled') {
    return { label: 'Off', bg: 'rgba(148, 163, 184, 0.12)', fg: 'var(--dash-text-secondary)' };
  }
  return null;
}

function ConfirmModal({ state, onClose }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
            style={{
              borderColor: 'var(--dash-border)',
              backgroundColor: 'var(--dash-bg-raised)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display font-semibold text-base mb-2" style={{ color: 'var(--dash-text-primary)' }}>
              {state.title}
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--dash-text-secondary)' }}>
              {state.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold border"
                style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await state.onConfirm?.();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  backgroundColor: state.destructive ? 'rgb(248, 113, 113)' : 'var(--accent, #00d4aa)',
                  color: state.destructive ? '#fff' : '#0a0a0a',
                }}
              >
                {state.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Channel icons (inline SVGs, no external deps) ───── */

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M21.95 4.45 18.51 20.7c-.26 1.15-.94 1.44-1.9.9l-5.25-3.87-2.53 2.44c-.28.28-.52.52-1.05.52l.37-5.34 9.71-8.78c.42-.38-.09-.59-.66-.21L5.21 13.05.04 11.43c-1.12-.35-1.14-1.12.24-1.66L20.5 2.8c.95-.35 1.77.22 1.45 1.65z"
        fill="#229ED9"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--accent, #00d4aa)' }} />
      <path d="m3.5 7 8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent, #00d4aa)' }} />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dash-text-secondary)" strokeWidth="1.8" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path strokeLinecap="round" d="M10.5 18.5h3" />
    </svg>
  );
}
