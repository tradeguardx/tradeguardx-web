import { NavLink, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { SETTINGS_TABS } from './settingsNav';
import { sx } from './sx';

/**
 * The tab bar over Alerts, Plan & billing and Security. It follows the width
 * of the page below it: Plan & billing is a wide centred page, the other two
 * are narrow and left-aligned, so the bar lines up with each heading.
 */
export function SettingsTabs({ wide = false }) {
  const { pathname, search } = useLocation();
  const guard = useGuard();
  const life = guard.ready ? guard.life : null;

  return (
    <div style={sx(wide ? 'max-width:1120px;margin:0 auto 20px' : 'max-width:760px;margin-bottom:20px')}>
      <div style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px")}>
        Settings
      </div>
      <nav
        aria-label="Settings"
        className="tgx-settings-tabs"
        style={sx('display:flex;gap:4px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none')}
      >
        {SETTINGS_TABS.map((t) => {
          const on = pathname === t.to || pathname.startsWith(`${t.to}/`);
          const flag = life?.badges?.[t.id];
          return (
            <NavLink
              key={t.id}
              to={on ? `${t.to}${search}` : t.to}
              aria-current={on ? 'page' : undefined}
              style={sx(
                'position:relative;flex:none;display:inline-flex;align-items:center;gap:7px;padding:10px 12px 11px;margin-bottom:-1px;font-size:13.5px;font-weight:600;letter-spacing:-.005em;text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent',
                { color: on ? 'var(--ink)' : 'var(--ink-3)', borderBottomColor: on ? 'var(--mint-solid)' : 'transparent' },
              )}
            >
              {t.label}
              {flag ? (
                <span aria-label="Needs attention" style={sx("font:700 10px/1 'JetBrains Mono',monospace;color:var(--red)")}>{flag}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/** Wraps a settings page with the tab bar. */
export function SettingsFrame({ wide = false, children }) {
  return (
    <>
      <SettingsTabs wide={wide} />
      {children}
    </>
  );
}
