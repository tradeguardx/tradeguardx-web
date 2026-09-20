import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import { validatePasswordPair } from '../lib/password';
import { sx } from '../components/dashboard/shell/sx';

/**
 * Security — transcribed from the reference (lines 2358–2411). Password
 * change keeps the current-password check (an unlocked laptop must not be
 * able to lock the owner out of an account wired to a live key); Google-only
 * accounts are told where sign-in is managed instead of shown a form that
 * fails. Sessions-and-keys rows derive per account from enforcementOf.
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const INPUT = 'width:100%;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:13px';

export default function SecuritySettingsPage() {
  const { user, session, updatePassword, verifyPassword } = useAuth();
  const { all } = useGuard();
  const toast = useToast();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const providers = session?.user?.app_metadata?.providers ?? (session?.user?.app_metadata?.provider ? [session.user.app_metadata.provider] : []);
  const googleOnly = providers.length > 0 && !providers.includes('email');

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const problem = validatePasswordPair(password, confirm);
    if (problem) { setError(problem); return; }
    if (password === current) { setError('That’s your current password — choose a different one.'); return; }
    setSaving(true);
    try {
      const ok = await verifyPassword(user?.email, current);
      if (!ok) { setError('That password is incorrect.'); return; }
      await updatePassword(password);
      setCurrent(''); setPassword(''); setConfirm('');
      toast.success('Password updated', 'Use your new password next time you sign in.');
    } catch (err) {
      toast.error('Could not update password', err?.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const anyLocked = all.some((s) => s.guard === 'locked');
  const keyRows = all.filter((s) => s.account).map((s) => {
    const label = s.account.name;
    if (s.enforcement === 'watching') return { id: s.accountId, label, note: 'read-only key — cannot cancel or close', badge: 'Read-only', fg: 'var(--amber)', act: 'Replace key' };
    if (s.enforcement === 'armed') return { id: s.accountId, label, note: 'trading scope, verified on connect', badge: 'Verified', fg: 'var(--mint)', act: '' };
    return { id: s.accountId, label, note: 'no key connected — nothing is enforced', badge: 'Missing', fg: 'var(--red)', act: 'Connect' };
  });

  return (
    <div style={sx('max-width:760px')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Security</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>Account access only — password, sessions and keys.</p>
      </div>

      <section style={sx('display:flex;align-items:center;gap:15px;padding:17px 19px;margin-bottom:16px;border:1px solid var(--mint-line);border-radius:18px;background:var(--mint-tint);flex-wrap:wrap')}>
        <span style={sx('flex:none;width:34px;height:34px;border-radius:10px;background:var(--surface);display:grid;place-items:center;color:var(--mint)')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 4v7" /><path d="M6.8 7.4a7.4 7.4 0 1010.4 0" /></svg>
        </span>
        <span style={sx('flex:1;min-width:240px')}>
          <span style={sx('display:block;font-size:13.5px;font-weight:700;color:var(--mint)')}>Looking for the killswitch or rule lock?</span>
          <span style={sx('display:block;font-size:12.5px;line-height:1.55;color:var(--ink-2);margin-top:3px;max-width:82ch')}>They moved out of settings and onto Live guard, next to the trading they protect — you should be able to reach them mid-session without hunting through account pages.</span>
        </span>
        <button type="button" onClick={() => navigate('/dashboard/live')} style={sx('flex:none;padding:9px 14px;border:1px solid var(--mint-line);border-radius:9px;background:var(--surface);color:var(--mint);font-size:12.5px;font-weight:700')}>Open commitment controls</button>
      </section>

      <section style={sx('margin-bottom:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx(H3)}>Change password</h3>
          <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-2);max-width:70ch')}>We ask for your current password even though the auth provider does not require it. An unlocked laptop should not be able to lock the real owner out of an account wired to a live exchange key.</p>
        </div>
        {googleOnly ? (
          <div style={sx('padding:18px 19px;font-size:13px;line-height:1.6;color:var(--ink-2);max-width:70ch')}>
            You created this account with <strong style={sx('color:var(--ink);font-weight:600')}>Continue with Google</strong>, so there&rsquo;s no TradeGuardX password to change. Your sign-in security — password, 2-step verification — is managed in your Google account.
          </div>
        ) : (
          <form onSubmit={submit} style={sx('padding:18px 19px;display:grid;gap:12px;max-width:420px')}>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" required style={sx(INPUT)} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" autoComplete="new-password" required style={sx(INPUT)} />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" required style={sx(INPUT)} />
            {error && <p style={sx('margin:0;font-size:12.5px;color:var(--red)')}>{error}</p>}
            <button type="submit" disabled={saving} style={sx('justify-self:start;padding:10px 15px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>{saving ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </section>

      <section style={sx('border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}><h3 style={sx(H3)}>Sessions and keys</h3></div>
        {keyRows.length === 0 && <div style={sx('padding:15px 19px;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink-3)')}>No accounts yet.</div>}
        {keyRows.map((r) => (
          <div key={r.id} style={sx('display:flex;align-items:center;gap:12px;padding:15px 19px;border-bottom:1px solid var(--line);flex-wrap:wrap')}>
            <span style={sx('flex:1;min-width:220px;font-size:13px;color:var(--ink-2)')}><strong style={sx('color:var(--ink);font-weight:600')}>{r.label}</strong> — {r.note}</span>
            <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase", { color: r.fg })}>{r.badge}</span>
            {r.act && !anyLocked && (
              <button type="button" onClick={() => navigate('/dashboard/connect')} style={sx('padding:7px 11px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:700')}>{r.act}</button>
            )}
          </div>
        ))}
        <div style={sx('padding:14px 19px;background:var(--surface-2);font-size:12.5px;line-height:1.55;color:var(--ink-2)')}>While a lockout is running, keys cannot be disconnected or replaced. Otherwise removing the key would be a way around the lock.</div>
      </section>
    </div>
  );
}
