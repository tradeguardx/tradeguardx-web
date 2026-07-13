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
  const [linking, setLinking] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, onConfirm }

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchNotificationSettings({ accessToken });
      setSettings(result);
      setEmailInput(result?.notificationEmail ?? fallbackEmail);
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
          icon={<WhatsAppIcon />}
          title="WhatsApp"
          description="Coming soon — alerts via WhatsApp messages, ideal for mobile."
          status="coming_soon"
          enabled={false}
          canToggle={false}
          action={
            <span
              className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(168, 85, 247, 0.12)', color: 'rgb(168, 85, 247)' }}
            >
              Coming soon
            </span>
          }
          saving={saving}
        />
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

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.5 14.36c-.27-.13-1.58-.78-1.82-.86s-.42-.13-.6.13c-.17.27-.69.86-.85 1.04-.16.18-.31.2-.58.07-.27-.13-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.31.4-.46.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.44-.82-1.97-.22-.52-.44-.45-.6-.46-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.95 2.58 1.08 2.76.13.18 1.87 2.86 4.54 4 .63.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.58-.65 1.8-1.27.22-.62.22-1.16.16-1.27-.07-.11-.25-.18-.52-.31zM12.05 22h-.01a9.93 9.93 0 0 1-5.06-1.39L2 22l1.43-4.85A9.94 9.94 0 1 1 12.06 22h-.01zm0-18.18a8.24 8.24 0 0 0-7.05 12.52l.2.32-.85 3.1 3.18-.84.31.18a8.22 8.22 0 0 0 4.21 1.15h.01A8.24 8.24 0 1 0 12.05 3.82z"
        fill="#25D366"
      />
    </svg>
  );
}
