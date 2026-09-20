import { NavLink, Link } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useDashboardTheme } from '../../../context/DashboardThemeContext';
import {
  IcOverview, IcLive, IcRules, IcJournal, IcTrades, IcTax,
  IcAccounts, IcKey, IcBell, IcBilling, IcSecurity, IcPrefs, IcSun, IcMoon, IcShield,
} from './icons';

/**
 * Sidebar — 252px, three labelled groups. Badges are derived, never
 * hardcoded: live pill from guard state, rules on/total from the bundle,
 * account count from the list, `!` on Connect key until the account is armed.
 *
 * No sign-out here. Account actions live in the avatar menu so the
 * state-aware confirm cannot be bypassed.
 */

const GROUPS = [
  {
    label: 'Protect',
    items: [
      { to: '/dashboard/overview', label: 'Overview', Icon: IcOverview, end: true },
      { to: '/dashboard/live', label: 'Live guard', Icon: IcLive, badge: 'live' },
      { to: '/dashboard/rules', label: 'Rules', Icon: IcRules, badge: 'rules' },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/dashboard/journal', label: 'Journal', Icon: IcJournal },
      { to: '/dashboard/trades', label: 'All trades', Icon: IcTrades },
      { to: '/dashboard/tax', label: 'Tax centre', Icon: IcTax },
    ],
  },
  {
    label: 'Setup',
    items: [
      { to: '/dashboard/account/trading', label: 'Accounts', Icon: IcAccounts, badge: 'accounts' },
      { to: '/dashboard/connect', label: 'Connect key', Icon: IcKey, badge: 'key' },
      { to: '/dashboard/alerts', label: 'Alerts', Icon: IcBell },
      { to: '/dashboard/account/billing', label: 'Plan & billing', Icon: IcBilling },
      { to: '/dashboard/account/security', label: 'Security', Icon: IcSecurity },
    ],
  },
];

function Badge({ kind, guard, accounts }) {
  if (kind === 'live') {
    if (guard.guard === 'armed') return <span className="dsb-badge dsb-badge--mint">live</span>;
    if (guard.guard === 'locked') return <span className="dsb-badge dsb-badge--red">locked</span>;
    return null;
  }
  if (kind === 'rules') {
    if (!guard.loaded || guard.rulesTotal === 0) return null;
    return <span className="dsb-badge tnum">{guard.rulesOn}/{guard.rulesTotal}</span>;
  }
  if (kind === 'accounts') {
    const n = accounts.length;
    return n > 0 ? <span className="dsb-badge tnum">{n}</span> : null;
  }
  if (kind === 'key') {
    if (!guard.loaded || !guard.account) return null;
    return guard.enforcement === 'armed' ? null : <span className="dsb-badge dsb-badge--red">!</span>;
  }
  return null;
}

export default function Sidebar({ onNavigate }) {
  const guard = useGuard();
  const { accounts } = useTradingAccounts();
  const { isDark, toggleTheme } = useDashboardTheme();
  const g = guard.selected;

  return (
    <div className="dsb">
      <Link to="/dashboard/overview" className="dsb-brand" onClick={onNavigate}>
        <span className="dsb-brand__mark" aria-hidden><IcShield size={18} /></span>
        <span className="dsb-brand__name">TradeGuardX</span>
      </Link>

      <nav className="dsb-nav" aria-label="Dashboard">
        {GROUPS.map((group) => (
          <div key={group.label} className="dsb-group">
            <div className="dsb-group__label dsh-mono">{group.label}</div>
            {group.items.map(({ to, label, Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => `dsb-link${isActive ? ' dsb-link--active' : ''}`}
              >
                <Icon size={16} />
                <span className="dsb-link__label">{label}</span>
                {badge && <Badge kind={badge} guard={g} accounts={accounts} />}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="dsb-foot">
        <button type="button" className="dsb-link" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <IcSun size={16} /> : <IcMoon size={16} />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
        <NavLink
          to="/dashboard/preferences"
          onClick={onNavigate}
          className={({ isActive }) => `dsb-link dsb-link--icon${isActive ? ' dsb-link--active' : ''}`}
          aria-label="Preferences"
          title="Preferences"
        >
          <IcPrefs size={16} />
        </NavLink>
      </div>
    </div>
  );
}
