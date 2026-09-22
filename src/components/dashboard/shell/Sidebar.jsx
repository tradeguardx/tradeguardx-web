import { NavLink, Link, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useDashboardTheme } from '../../../context/DashboardThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { ICON } from './icons';
import { useUpcomingCalendar } from '../../../hooks/useUpcomingCalendar';
import { sx } from './sx';

/**
 * Sidebar — transcribed from the reference <aside> (lines 240–299).
 * Every inline style is the reference's, converted mechanically by sx().
 * Badges derive from guard state and counts; nothing is hardcoded.
 */

const GROUP_LABEL = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);padding:18px 9px 8px";
const ITEM = "position:relative;width:100%;display:flex;align-items:center;gap:11px;padding:9px 10px;margin-bottom:2px;border:0;border-radius:10px;text-align:left;font-size:13.5px;font-weight:500;letter-spacing:-.005em;text-decoration:none";

function NavItem({ id, to, label, badge, end, onNavigate }) {
  const { pathname } = useLocation();
  const on = end ? pathname === to : pathname.startsWith(to);
  const d = ICON[id] ?? ['', ''];
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className="dsb-item"
      style={sx(ITEM, {
        background: on ? 'linear-gradient(90deg,var(--mint-tint),transparent 78%)' : 'transparent',
        color: on ? 'var(--ink)' : 'var(--ink-2)',
      })}
    >
      <span style={sx('position:absolute;left:0;top:9px;bottom:9px;width:2px;border-radius:2px', { background: on ? 'var(--mint-solid)' : 'transparent' })} />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={on ? 'var(--mint)' : 'var(--ink-faint)'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
        <path d={d[0]} />
        <path d={d[1]} />
      </svg>
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span style={sx("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase", { color: on ? 'var(--mint)' : 'var(--ink-faint)' })}>{badge}</span>
      ) : null}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const guard = useGuard();
  const { accounts } = useTradingAccounts();
  const { isDark, toggleTheme } = useDashboardTheme();
  const { user } = useAuth();
  const g = guard.selected;
  // Global count of upcoming high-impact releases — not scoped to the range being browsed.
  const upcoming = useUpcomingCalendar();
  const upcomingHigh = (upcoming.data?.days ?? []).reduce((n, d) => n + d.events.filter((e) => e.impact === 3 && e.time_status === 'exact' && new Date(e.event_time_utc).getTime() > guard.now).length, 0);
  // "Pro plan" with one account; the count only earns its place once there are several.
  // Until the subscription answers, say nothing about the plan rather than
  // "Free" — a paying user reading that on every login is a small betrayal.
  const planWord = user?.planKnown ? user.planLabel || 'Free' : '';
  const planLine = planWord
    ? (accounts.length > 1 ? `${planWord} · ${accounts.length} accounts` : `${planWord} plan`)
    : (accounts.length > 1 ? `${accounts.length} accounts` : '');

  const protect = [
    { id: 'overview', to: '/dashboard/overview', label: 'Overview', end: true },
    { id: 'live', to: '/dashboard/live', label: 'Live guard', badge: g.guard === 'armed' ? 'live' : '' },
    { id: 'rules', to: '/dashboard/rules', label: 'Rules', badge: g.loaded && g.rulesTotal ? `${g.rulesOn}/${g.rulesTotal}` : '' },
  ];
  const review = [
    { id: 'journal', to: '/dashboard/journal', label: 'Journal' },
    { id: 'trades', to: '/dashboard/trades', label: 'All trades' },
    { id: 'tax', to: '/dashboard/tax', label: 'Tax centre' },
  ];
  const market = [
    { id: 'calendar', to: '/dashboard/calendar', label: 'Economic calendar', badge: upcomingHigh ? String(upcomingHigh) : '' },
  ];
  const setup = [
    { id: 'accounts', to: '/dashboard/account/trading', label: 'Accounts', badge: accounts.length ? String(accounts.length) : '' },
    { id: 'connect', to: '/dashboard/connect', label: 'Connect key', badge: g.loaded && g.account && g.guard !== 'armed' ? '!' : '' },
    { id: 'bell', to: '/dashboard/alerts', label: 'Alerts' },
    { id: 'plan', to: '/dashboard/account/billing', label: 'Plan & billing' },
    { id: 'security', to: '/dashboard/account/security', label: 'Security' },
  ];

  return (
    <>
      <div style={sx('padding:19px 18px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid var(--line)')}>
        <div style={sx('flex:none;width:33px;height:33px;border-radius:10px;background-image:linear-gradient(150deg,#3df2d2,#00b894);display:grid;place-items:center;box-shadow:var(--glow-mint)')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#02241d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" /><path d="M9 12l2.2 2.2L15.5 10" /></svg>
        </div>
        <div style={sx('min-width:0;flex:1')}>
          <Link to="/dashboard/overview" onClick={onNavigate} style={sx("font:600 15px/1.1 'Space Grotesk',sans-serif;letter-spacing:-.015em;color:var(--ink);text-decoration:none;display:block")}>TradeGuardX</Link>
          <div style={sx("font:500 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin-top:5px")}>{planLine}</div>
        </div>
      </div>

      <nav style={sx('flex:1;overflow-y:auto;padding:6px 10px 10px')} aria-label="Dashboard">
        <div style={sx(GROUP_LABEL, { padding: '14px 9px 8px' })}>Protect</div>
        {protect.map((i) => <NavItem key={i.id} {...i} onNavigate={onNavigate} />)}
        <div style={sx(GROUP_LABEL)}>Market</div>
        {market.map((i) => <NavItem key={i.id} {...i} onNavigate={onNavigate} />)}
        <div style={sx(GROUP_LABEL)}>Review</div>
        {review.map((i) => <NavItem key={i.id} {...i} onNavigate={onNavigate} />)}
        <div style={sx(GROUP_LABEL)}>Setup</div>
        {setup.map((i) => <NavItem key={i.id} {...i} onNavigate={onNavigate} />)}
      </nav>

      <div style={sx('flex:none;padding:12px 14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px')}>
        <button type="button" onClick={toggleTheme} className="dsb-theme" style={sx('flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-2);font-size:12.5px;font-weight:600')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></svg>
          {isDark ? 'Light' : 'Dark'}
        </button>
        <Link to="/dashboard/preferences" onClick={onNavigate} title="Preferences" className="dsb-prefs" style={sx('display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-3)')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.4l.9 1.6-2.3 2.3-1.6-.9a7 7 0 01-1.7 1l-.4 1.8h-3.3l-.4-1.8a7 7 0 01-1.7-1l-1.6.9-2.3-2.3.9-1.6a7 7 0 01-.4-1.9L3.7 12l.5-1.9 1.8-.4a7 7 0 01.9-1.7l-.9-1.6L8.3 4l1.6.9a7 7 0 011.7-.9l.4-1.8h3.3" /></svg>
        </Link>
      </div>
    </>
  );
}
