import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import {
  fetchNotificationSettings, updateNotificationSettings, createTelegramBindingLink, disconnectTelegram,
} from '../api/notificationsApi';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Alerts — transcribed from the reference (lines 1769–1983). Same settings
 * endpoints as before: channel toggles, delivery email, mobile number,
 * severity threshold, Telegram binding link.
 */

const MONO = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint)";
const CHIP_ON = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--mint-tint);color:var(--mint)";
const CHIP_OFF = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--surface-3);color:var(--ink-3)";
const CHIP_AMBER = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--amber-tint);color:var(--amber)";
const ICON_WRAP = 'flex:none;width:34px;height:34px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);display:grid;place-items:center';

function Toggle({ on, onClick, label }) {
  return on ? (
    <button type="button" role="switch" aria-checked="true" aria-label={label} onClick={onClick} style={sx('flex:none;position:relative;width:38px;height:22px;border-radius:999px;border:0;background:var(--mint-solid)')}>
      <span style={sx('position:absolute;top:3px;left:19px;width:16px;height:16px;border-radius:50%;background:#fff')} />
    </button>
  ) : (
    <button type="button" role="switch" aria-checked="false" aria-label={label} onClick={onClick} style={sx('flex:none;position:relative;width:38px;height:22px;border-radius:999px;background:var(--surface-3);border:1px solid var(--line)')}>
      <span style={sx('position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--ink-faint)')} />
    </button>
  );
}

/**
 * Alert settings, shared between the Alerts page and the third stage of the
 * add-a-venue wizard.
 *
 * Exported so the wizard shows the real settings rather than a stripped copy.
 * `embedded` drops the page heading — inside the wizard the stage rail already
 * says where you are.
 */
export function AlertsSettings({ embedded = false }) {
  const { session, user } = useAuth();
  const { refresh } = useGuard();
  const toast = useToast();
  const accessToken = session?.access_token;
  const [s, setS] = useState(null);
  const [emailVal, setEmailVal] = useState('');
  const [mobileVal, setMobileVal] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal) => {
    if (!accessToken) return;
    try {
      const r = await fetchNotificationSettings({ accessToken, signal });
      if (r) {
        setS(r);
        setEmailVal(r.notificationEmail ?? '');
        setMobileVal((r.phone ?? '').replace(/^\+91/, ''));
      }
    } catch { /* keep */ }
  }, [accessToken]);

  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);
  useEffect(() => {
    if (!s?.telegramPending) return undefined;
    const id = setInterval(() => load(), 4000);
    return () => clearInterval(id);
  }, [s?.telegramPending, load]);

  const save = async (patch) => {
    setBusy(true);
    try {
      const r = await updateNotificationSettings({ accessToken, ...patch });
      if (r) setS(r);
      await refresh();
    } catch (e) { toast.error('Could not save', e?.message || 'Try again.'); }
    finally { setBusy(false); }
  };

  const connectTg = async () => {
    try {
      const link = await createTelegramBindingLink({ accessToken });
      if (link) { window.open(link, '_blank', 'noopener,noreferrer'); toast.success('Opening Telegram', 'Press Start in the bot to finish linking.'); await load(); }
    } catch (e) { toast.error('Could not generate link', e?.message); }
  };
  const disconnectTg = async () => {
    try { await disconnectTelegram({ accessToken }); await load(); await refresh(); } catch (e) { toast.error('Could not disconnect', e?.message); }
  };


  const tgOn = Boolean(s?.telegramConnected);
  const emOn = Boolean(s?.emailNotificationsEnabled);
  const mbOn = Boolean(s?.mobileNotificationsEnabled);
  const mobileSaved = Boolean(s?.phone);
  const emailDirty = emailVal.trim() !== (s?.notificationEmail ?? '');
  const mobileDigits = mobileVal.replace(/\D/g, '');
  const mobileDirty = mobileDigits.length >= 10 && `+91${mobileDigits}` !== (s?.phone ?? '');
  const sev = s?.notificationMinSeverity ?? 'warning';

  return (
    <div style={sx(embedded ? '' : 'max-width:760px')}>
      {!embedded && (
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Alerts</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>The guard acts whether or not you are watching. Alerts are how you find out it did.</p>
      </div>
      )}

      <section style={sx('margin-bottom:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('display:flex;align-items:flex-start;gap:14px;padding:18px 21px;border-bottom:1px solid var(--line)')}>
          <span style={sx(ICON_WRAP, { color: 'var(--blue)' })}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4L3 11l6 2.4L19 7l-7.5 8.2.6 5.3 3-3.9" /></svg>
          </span>
          <div style={sx('flex:1;min-width:0')}>
            <div style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
              <span style={sx('font-size:14px;font-weight:600')}>Telegram</span>
              <span style={sx(tgOn ? CHIP_ON : s?.telegramPending ? CHIP_AMBER : CHIP_AMBER)}>{tgOn ? 'Connected' : s?.telegramPending ? 'Waiting for Start' : 'Off'}</span>
            </div>
            <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:62ch')}>Real-time alerts to your Telegram chat. The fastest channel — seconds, not minutes, which matters inside a losing session.</p>
          </div>
          <div style={sx('flex:none;display:flex;align-items:center;gap:10px')}>
            {tgOn ? (
              <>
                <Toggle on={Boolean(s?.telegramNotificationsEnabled)} label="Telegram alerts" onClick={() => !busy && save({ telegramNotificationsEnabled: !s?.telegramNotificationsEnabled })} />
                <button type="button" onClick={disconnectTg} style={sx('padding:7px 12px;border:1px solid var(--red-line);border-radius:8px;background:transparent;color:var(--red);font-size:12px;font-weight:600')}>Disconnect</button>
              </>
            ) : (
              <button type="button" onClick={connectTg} style={sx('padding:8px 13px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>{s?.telegramPending ? 'Open again' : 'Connect'}</button>
            )}
          </div>
        </div>

        <div style={sx('padding:18px 21px;border-bottom:1px solid var(--line)')}>
          <div style={sx('display:flex;align-items:flex-start;gap:14px')}>
            <span style={sx(ICON_WRAP, { color: 'var(--ink-2)' })}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18v12H3z" /><path d="M3 7l9 6 9-6" /></svg>
            </span>
            <div style={sx('flex:1;min-width:0')}>
              <div style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                <span style={sx('font-size:14px;font-weight:600')}>Email</span>
                <span style={sx(emOn ? CHIP_ON : CHIP_OFF)}>{emOn ? 'Connected' : 'Off'}</span>
              </div>
              <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>A reliable written record, but slower — it often lands after the position is already closed.</p>
            </div>
            <Toggle on={emOn} label="Email alerts" onClick={() => !busy && save({ emailNotificationsEnabled: !emOn })} />
          </div>
          {emOn && (
            <div style={sx('margin:13px 0 0 48px')}>
              <div style={sx(MONO, { marginBottom: 8 })}>Delivery address</div>
              <div style={sx('display:flex;gap:9px;flex-wrap:wrap')}>
                <input value={emailVal} onChange={(e) => setEmailVal(e.target.value)} placeholder={user?.email || 'you@example.com'} style={sx('flex:1;min-width:min(220px,100%);padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:13px')} />
                {emailDirty ? (
                  <button type="button" disabled={busy} onClick={() => save({ notificationEmail: emailVal.trim() || null })} style={sx('flex:none;padding:11px 16px;border:1px solid var(--ink);border-radius:10px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Save</button>
                ) : (
                  <span style={sx('flex:none;display:flex;align-items:center;gap:7px;padding:11px 14px;font-size:12.5px;font-weight:600;color:var(--mint)')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={sx('padding:18px 21px')}>
          <div style={sx('display:flex;align-items:flex-start;gap:14px')}>
            <span style={sx(ICON_WRAP, { color: 'var(--ink-2)' })}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10v18H7z" /><path d="M11 18h2" /></svg>
            </span>
            <div style={sx('flex:1;min-width:0')}>
              <div style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap')}>
                <span style={sx('font-size:14px;font-weight:600')}>Mobile</span>
                <span style={sx(mobileSaved ? CHIP_ON : CHIP_OFF)}>{mobileSaved ? 'Connected' : 'No number'}</span>
              </div>
              <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>Risk alerts on your phone. {mobileSaved ? 'Saved. Use the switch above to turn alerts on this number on or off.' : 'WhatsApp and SMS delivery is rolling out shortly.'}</p>
            </div>
            <Toggle on={mbOn} label="Mobile alerts" onClick={() => !busy && save({ mobileNotificationsEnabled: !mbOn })} />
          </div>
          <div style={sx('margin:13px 0 0 48px')}>
            <div style={sx(MONO, { marginBottom: 8 })}>Mobile number</div>
            <div style={sx('display:flex;gap:9px;flex-wrap:wrap')}>
              <span style={sx("flex:none;display:flex;align-items:center;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-3);font:500 13px/1 'JetBrains Mono',monospace;color:var(--ink-2)")}>+91</span>
              <input value={mobileVal} onChange={(e) => setMobileVal(e.target.value)} placeholder="98765 43210" inputMode="numeric" style={sx('flex:1;min-width:180px;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:13px;font-variant-numeric:tabular-nums')} />
              <button type="button" disabled={!mobileDirty || busy} onClick={() => save({ phone: `+91${mobileDigits}` })} style={sx('flex:none;padding:11px 16px;border:0;border-radius:10px;font-size:12.5px;font-weight:700', { background: mobileDirty ? 'var(--ink)' : 'var(--surface-3)', color: mobileDirty ? 'var(--surface)' : 'var(--ink-3)' })}>Save</button>
            </div>
          </div>
        </div>
      </section>

      <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx("margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em")}>How much to send</h3>
          <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-3)')}>One setting for both channels. Critical always includes a breach or a lockout.</p>
        </div>
        {[['info', 'Everything', 'info, warning and critical'], ['warning', 'Warnings and critical', 'the sensible default'], ['critical', 'Critical only', 'breaches and lockouts']].map(([id, label, note]) => (
          <button key={id} type="button" role="radio" aria-checked={sev === id} onClick={() => !busy && save({ notificationMinSeverity: id })} style={sx('width:100%;display:flex;align-items:center;gap:12px;padding:15px 21px;border:0;border-bottom:1px solid var(--line);text-align:left;color:var(--ink);background:transparent')}>
            <span style={sx('flex:none;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line-strong)')}>
              {sev === id && <span style={sx('width:9px;height:9px;border-radius:50%;background:var(--ink)')} />}
            </span>
            <span style={{ flex: 1 }}>
              <span style={sx('display:block;font-size:13.5px;font-weight:600')}>{label}</span>
              <span style={sx('display:block;font-size:12px;color:var(--ink-3);margin-top:3px')}>{note}</span>
            </span>
          </button>
        ))}
        <div style={sx('padding:16px 19px;background:var(--surface-2)')}>
          <div style={sx('font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint);font-weight:600;margin-bottom:9px')}>What a critical alert looks like</div>
          <div style={sx('padding:13px 15px;border:1px solid var(--red-line);border-radius:10px;background:var(--surface)')}>
            <div style={sx('font-size:12.5px;font-weight:700;color:var(--red)')}>Risk alert · critical</div>
            <p style={sx('margin:6px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>Daily loss limit hit on Delta · Main at 14:07. Orders cancelled, 2 positions closed, account verified flat. Locked until 00:00 IST.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AlertsPage() {
  return <AlertsSettings />;
}
