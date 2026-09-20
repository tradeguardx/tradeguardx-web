import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';
import { useToast } from '../components/common/ToastProvider';
import PageHead from '../components/dashboard/shell/PageHead';

/**
 * Preferences — profile, display, session, close account.
 *
 * Prefs persist in this browser (see lib/prefs.js); the landing screen is
 * honoured on sign-in by LoginPage. Name edits go through Supabase user
 * metadata (already how the name is stored); email is read-only here — it is
 * the login and the fallback alert channel, and changes from Security with a
 * password check.
 */

function Row({ label, hint, children }) {
  return (
    <div className="dpf-row">
      <div className="dpf-row__text">
        <p className="dpf-row__label">{label}</p>
        {hint && <p className="dsh-meta">{hint}</p>}
      </div>
      <div className="dpf-row__ctl">{children}</div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="dseg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={`dseg__btn${value === o.value ? ' dseg__btn--on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`dtg${on ? ' dtg--on' : ''}`} onClick={() => onChange(!on)}>
      <span className="dtg__knob" />
    </button>
  );
}

export default function PreferencesPage() {
  const { user, updateProfileName } = useAuth();
  const { prefs, setPref } = usePrefs();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (!updateProfileName) {
      // TODO(api): AuthContext exposes no profile-name update today.
      toast.info('Name changes are coming', 'For now, your name is taken from your sign-in provider.');
      return;
    }
    setSaving(true);
    try { await updateProfileName(name.trim()); toast.success('Name updated'); }
    catch (e) { toast.error('Could not update your name', e?.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHead title="Preferences" sub="How the dashboard behaves for you. These follow this browser." />

      <section className="dsh-card dpf-section">
        <h2 className="dsh-h2">Profile</h2>
        <Row label="Name">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="dsh-input" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }} />
            <button type="button" className="dsh-btn" disabled={saving || name.trim() === (user?.name ?? '')} onClick={saveName}>Save</button>
          </div>
        </Row>
        <Row label="Email" hint="Your login and the fallback alert channel. Change it from Security with a password check.">
          <input className="dsh-input" value={user?.email ?? ''} readOnly style={{ maxWidth: 320, color: 'var(--ink-3)' }} />
        </Row>
      </section>

      <section className="dsh-card dpf-section">
        <h2 className="dsh-h2">Display</h2>
        <Row label="Row density">
          <Seg value={prefs.density} onChange={(v) => setPref('density', v)} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
        </Row>
        <Row label="Display currency" hint="For our own figures. The Tax centre is always INR — it must match what is filed.">
          <Seg value={prefs.currency} onChange={(v) => setPref('currency', v)} options={[{ value: 'USD', label: 'USD' }, { value: 'INR', label: 'INR' }]} />
        </Row>
        <Row label="Week starts on">
          <Seg value={prefs.weekStart} onChange={(v) => setPref('weekStart', v)} options={[{ value: 'mon', label: 'Monday' }, { value: 'sun', label: 'Sunday' }]} />
        </Row>
      </section>

      <section className="dsh-card dpf-section">
        <h2 className="dsh-h2">Session</h2>
        <Row label="Landing screen" hint="Where sign-in takes you.">
          <Seg value={prefs.landing} onChange={(v) => setPref('landing', v)} options={[{ value: 'overview', label: 'Overview' }, { value: 'live', label: 'Live guard' }]} />
        </Row>
        <Row label="Confirm before close" hint="Ask before closing a position from the dashboard.">
          <Toggle on={prefs.confirmBeforeClose} onChange={(v) => setPref('confirmBeforeClose', v)} label="Confirm before close" />
        </Row>
        <Row label="Sound on rule fire" hint="A short tone when a breach toast appears while the dashboard is open.">
          <Toggle on={prefs.soundOnRuleFire} onChange={(v) => setPref('soundOnRuleFire', v)} label="Sound on rule fire" />
        </Row>
      </section>

      <section className="dsh-card dpf-section">
        <h2 className="dsh-h2">Close account</h2>
        <p className="dsh-body">Keys are deleted immediately. Trade records are kept for 30 days so you can export them, then removed.</p>
        {/* TODO(api): no close-account endpoint exists; routes to support. */}
        <Link to="/support" className="dsh-btn" style={{ marginTop: 12, color: 'var(--red)' }}>Request account closure</Link>
      </section>
    </>
  );
}
