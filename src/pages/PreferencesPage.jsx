import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';
import { useToast } from '../components/common/ToastProvider';
import { sx } from '../components/dashboard/shell/sx';
import { initialsOf } from '../components/dashboard/shell/format';

/**
 * Preferences — transcribed from the reference (lines 2238–2357). Prefs
 * persist per browser (lib/prefs.js); the landing screen is honoured on
 * sign-in. The tweak props (accent, chrome) sit under Display.
 */

const MONO = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px";
const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'margin-bottom:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden';

function Options({ k, value, options, onPick }) {
  return (
    <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:9px')} role="radiogroup">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => onPick(k, o.v)} style={sx('display:flex;align-items:center;gap:10px;padding:12px 13px;border-radius:12px;text-align:left', { border: `1px solid ${on ? 'var(--mint-line)' : 'var(--line)'}`, background: on ? 'var(--mint-tint)' : 'var(--surface-2)' })}>
            <span style={sx('flex:none;width:15px;height:15px;border-radius:50%;display:grid;place-items:center', { border: `1px solid ${on ? 'var(--mint-solid)' : 'var(--line-strong)'}` })}><span style={sx('width:7px;height:7px;border-radius:50%', { background: on ? 'var(--mint-solid)' : 'transparent' })} /></span>
            <span style={sx('flex:1;min-width:0')}>
              <span style={sx('display:block;font-size:13px;font-weight:600', { color: on ? 'var(--mint)' : 'var(--ink)' })}>{o.label}</span>
              <span style={sx('display:block;font-size:11.5px;color:var(--ink-3);margin-top:2px')}>{o.note}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function PreferencesPage() {
  const { user } = useAuth();
  const { prefs, setPref } = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');

  const saveName = () => {
    // TODO(api): no profile-name endpoint is exposed; the name comes from the sign-in provider today.
    toast.info('Name changes are coming', 'For now, your name is taken from your sign-in provider.');
  };

  const toggles = [
    { k: 'confirmBeforeClose', on: prefs.confirmBeforeClose, label: 'Confirm before I close a position from here', note: 'One extra tap on the manual close button. Costs a second, prevents a mis-click during a fast session.' },
    { k: 'soundOnRuleFire', on: prefs.soundOnRuleFire, label: 'Play a sound when a rule fires', note: 'A short tone in this tab. Useful if you trade with the dashboard on a second monitor, off by default because it surprises people.' },
  ];

  return (
    <div style={sx('max-width:780px')}>
      <div style={sx('margin-bottom:16px')}>
        <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Preferences</h1>
        <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3)')}>How the dashboard behaves. Nothing here changes what is enforced — for that, use Rules.</p>
      </div>

      <section style={sx(CARD)}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}><h3 style={sx(H3)}>Your profile</h3></div>
        <div style={sx('padding:18px 19px;display:flex;align-items:center;gap:15px;flex-wrap:wrap')}>
          <span style={sx("flex:none;width:52px;height:52px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);display:grid;place-items:center;font:600 17px/1 'Space Grotesk',sans-serif;color:var(--ink-2)")}>{initialsOf(user?.name, user?.email)}</span>
          <div style={sx('flex:1;min-width:min(220px,100%);display:grid;gap:9px')}>
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" style={sx('width:100%;padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font-size:13px')} />
            <input value={user?.email ?? ''} readOnly aria-label="Email" style={sx('width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface-3);color:var(--ink-3);font-size:13px')} />
          </div>
          <button type="button" onClick={saveName} disabled={name.trim() === (user?.name ?? '')} style={sx('flex:none;padding:10px 15px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700')}>Save</button>
        </div>
        <div style={sx('padding:0 19px 18px;font-size:12px;line-height:1.55;color:var(--ink-3);max-width:74ch')}>Your email is the login and the fallback alert channel, so it changes from Security with a password check rather than here.</div>
      </section>

      <section style={sx(CARD)}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx(H3)}>Display</h3>
          <p style={sx('margin:5px 0 0;font-size:12.5px;color:var(--ink-2)')}>Applies to this browser only — your phone keeps its own setting.</p>
        </div>
        <div style={sx('padding:18px 19px;display:grid;gap:18px')}>
          <div>
            <div style={sx(MONO)}>Row density</div>
            <Options k="density" value={prefs.density} onPick={setPref} options={[{ v: 'comfortable', label: 'Comfortable', note: 'Default spacing' }, { v: 'compact', label: 'Compact', note: 'More rows per screen' }]} />
          </div>
          <div>
            <div style={sx(MONO)}>Display currency</div>
            <Options k="currency" value={prefs.currency} onPick={setPref} options={[{ v: 'USD', label: 'USD', note: 'Matches the exchange' }, { v: 'INR', label: 'INR', note: 'Converted at daily close' }]} />
            <p style={sx('margin:9px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3);max-width:74ch')}>Tax centre always reports in INR regardless of this setting — it has to match what you file.</p>
          </div>
          <div>
            <div style={sx(MONO)}>Week starts on</div>
            <Options k="weekStart" value={prefs.weekStart} onPick={setPref} options={[{ v: 'mon', label: 'Monday', note: 'Calendar starts Monday' }, { v: 'sun', label: 'Sunday', note: 'Calendar starts Sunday' }]} />
          </div>
          <div>
            <div style={sx(MONO)}>Accent</div>
            <Options k="accent" value={prefs.accent} onPick={setPref} options={[{ v: 'mint', label: 'Mint', note: 'Green accent' }, { v: 'signal', label: 'Signal', note: 'Default' }, { v: 'ion', label: 'Ion', note: 'Blue accent' }]} />
          </div>
          <div>
            <div style={sx(MONO)}>Chrome</div>
            <Options k="chrome" value={prefs.chrome} onPick={setPref} options={[{ v: 'depth', label: 'Depth', note: 'Shadows and washes' }, { v: 'flat', label: 'Flat', note: 'Borders only' }, { v: 'print', label: 'Print', note: 'Hairlines, tight radii' }]} />
          </div>
        </div>
      </section>

      <section style={sx(CARD)}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}><h3 style={sx(H3)}>Session behaviour</h3></div>
        <div style={sx('padding:18px 19px;display:grid;gap:16px')}>
          <div>
            <div style={sx(MONO)}>Open on sign-in</div>
            <Options k="landing" value={prefs.landing} onPick={setPref} options={[{ v: 'overview', label: 'Overview', note: 'What should I do next' }, { v: 'live', label: 'Live guard', note: 'Straight to the session' }]} />
          </div>
          {toggles.map((t) => (
            <div key={t.k} style={sx('display:flex;align-items:flex-start;gap:13px;padding-top:15px;border-top:1px solid var(--line)')}>
              <span style={sx('flex:1;min-width:0')}>
                <span style={sx('display:block;font-size:13px;font-weight:600')}>{t.label}</span>
                <span style={sx('display:block;font-size:12px;line-height:1.55;color:var(--ink-3);margin-top:3px;max-width:78ch')}>{t.note}</span>
              </span>
              <button type="button" role="switch" aria-checked={t.on} aria-label={t.label} onClick={() => setPref(t.k, !t.on)} style={sx('flex:none;position:relative;display:block;width:38px;height:22px;border-radius:999px;margin-top:1px;padding:0', { background: t.on ? 'var(--mint-solid)' : 'var(--surface-3)', border: `1px solid ${t.on ? 'var(--mint-solid)' : 'var(--line-strong)'}` })}>
                <span style={sx('position:absolute;top:2px;width:16px;height:16px;border-radius:50%', { left: t.on ? '19px' : '3px', background: t.on ? '#fff' : 'var(--ink-faint)' })} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={sx('border:1px solid var(--red-line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden')}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx(H3, { color: 'var(--red)' })}>Close your account</h3>
          <p style={sx('margin:5px 0 0;font-size:12.5px;line-height:1.55;color:var(--ink-2);max-width:78ch')}>We delete your keys immediately and stop all enforcement. Your trade history and tax records stay available for 30 days so you can export them, then go too.</p>
        </div>
        <div style={sx('padding:16px 19px;display:flex;gap:9px;flex-wrap:wrap')}>
          <button type="button" onClick={() => navigate('/dashboard/tax')} style={sx('padding:10px 14px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:700')}>Export my data first</button>
          {/* TODO(api): no close-account endpoint; routes to support. */}
          <button type="button" onClick={() => navigate('/support')} style={sx('padding:10px 14px;border:1px solid var(--red-line);border-radius:9px;background:var(--red-tint);color:var(--red);font-size:12.5px;font-weight:700')}>Delete account</button>
        </div>
      </section>
    </div>
  );
}
