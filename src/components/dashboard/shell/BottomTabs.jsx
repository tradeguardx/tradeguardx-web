import { NavLink, useLocation } from 'react-router-dom';
import { useGuard } from '../../../context/GuardContext';
import { ICON } from './icons';
import { sx } from './sx';

/**
 * Bottom tab bar — mobile only (≤900px, the same breakpoint at which the
 * sidebar becomes a drawer).
 *
 * The dashboard has twelve destinations behind a hamburger, so on a phone every
 * ordinary move cost a round trip: open drawer, read a twelve-item list, tap,
 * wait for the drawer to close. That is the difference between a website and an
 * app, and it is felt most by the person this product is for — someone checking
 * their guard mid-session, on a phone, while a position is open.
 *
 * Four destinations sit here and the rest stay in the drawer behind More. Which
 * four is not a popularity guess: they are the ones you open WHILE TRADING.
 * Live guard describes itself as "the screen to keep open while you trade", so
 * it is centre-weighted; Rules is where you go when the guard says something you
 * disagree with; Journal is the after. Everything administrative — billing,
 * security, tax, calendar, accounts — is deliberately one level down, because a
 * tab bar that holds everything is just a drawer lying on its side.
 *
 * THE BADGES ARE THE POINT, not decoration. A trader glancing at a phone should
 * be able to tell in one look whether the guard is actually armed, without
 * opening anything. They follow the same rule as the rest of the dashboard: say
 * nothing until the data has loaded. A grey dot on an unloaded guard would read
 * as "not protected" to someone who is, which is the false verdict this
 * codebase keeps having to design against.
 */

const TABS = [
  { id: 'overview', to: '/dashboard/overview', label: 'Home', end: true },
  { id: 'live', to: '/dashboard/live', label: 'Live' },
  { id: 'rules', to: '/dashboard/rules', label: 'Rules' },
  { id: 'journal', to: '/dashboard/journal', label: 'Journal' },
];

function Tab({ tab, dot }) {
  const { pathname } = useLocation();
  const on = tab.end ? pathname === tab.to : pathname.startsWith(tab.to);
  const d = ICON[tab.id] ?? ['', ''];
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      className="tgx-tab"
      aria-current={on ? 'page' : undefined}
      style={sx(
        'position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:7px 2px 5px;text-decoration:none;min-height:50px',
        { color: on ? 'var(--ink)' : 'var(--ink-3)' },
      )}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke={on ? 'var(--mint)' : 'var(--ink-faint)'}
          strokeWidth={on ? 2 : 1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={d[0]} />
          <path d={d[1]} />
        </svg>
        {dot ? (
          <span
            aria-hidden
            style={sx(
              'position:absolute;top:-1px;right:-3px;width:7px;height:7px;border-radius:50%;box-shadow:0 0 0 2px var(--surface)',
              { background: dot === 'warn' ? 'var(--amber)' : 'var(--mint-solid)' },
            )}
          />
        ) : null}
      </span>
      <span style={sx("font:600 10px/1 'Space Grotesk',system-ui,sans-serif;letter-spacing:-.005em")}>
        {tab.label}
      </span>
    </NavLink>
  );
}

export default function BottomTabs({ onMore }) {
  const guard = useGuard();
  const g = guard.selected;

  // No verdict before data. Until the guard has loaded, every tab is plain —
  // an absent badge says "we don't know yet", which is true, where a grey one
  // would say "you are not protected", which might not be.
  const liveDot = !g?.loaded ? '' : g.guard === 'armed' ? 'live' : 'warn';
  // One amber dot on More when something behind it needs a decision, so the
  // drawer is worth opening rather than worth ignoring.
  const moreDot = g?.loaded && g.account && g.guard !== 'armed' ? 'warn' : '';

  return (
    <nav
      className="tgx-tabbar"
      aria-label="Primary"
      style={sx(
        // Visibility is CSS's job, not an inline display:none waiting to be
        // overridden with !important. Declared visible here and hidden above
        // the drawer breakpoint, so a renamed selector or a dropped rule fails
        // by showing the bar on desktop — visible and obvious — rather than by
        // hiding it on mobile, where nobody would notice it had gone.
        'position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;align-items:stretch;' +
          'background:var(--surface);border-top:1px solid var(--line);' +
          // The inset keeps the row clear of the iPhone home indicator. Without
          // it the labels sit under the gesture bar and the end tabs swallow
          // swipes, which reads as the app ignoring taps.
          'padding-bottom:env(safe-area-inset-bottom,0px)',
      )}
    >
      {TABS.map((t) => (
        <Tab key={t.id} tab={t} dot={t.id === 'live' ? liveDot : ''} />
      ))}
      <button
        type="button"
        onClick={onMore}
        className="tgx-tab"
        aria-label="More navigation"
        style={sx(
          'position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
            'padding:7px 2px 5px;min-height:50px;border:0;background:transparent;color:var(--ink-3);cursor:pointer;font:inherit',
        )}
      >
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          {moreDot ? (
            <span
              aria-hidden
              style={sx('position:absolute;top:-1px;right:-3px;width:7px;height:7px;border-radius:50%;background:var(--amber);box-shadow:0 0 0 2px var(--surface)')}
            />
          ) : null}
        </span>
        <span style={sx("font:600 10px/1 'Space Grotesk',system-ui,sans-serif;letter-spacing:-.005em")}>More</span>
      </button>
    </nav>
  );
}
