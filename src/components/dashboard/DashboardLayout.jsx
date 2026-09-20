import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TradingAccountProvider } from '../../context/TradingAccountContext';
import { DashboardThemeProvider, useDashboardTheme } from '../../context/DashboardThemeContext';
import { GuardProvider, useGuard } from '../../context/GuardContext';
import { PrefsProvider, usePrefs } from '../../context/PrefsContext';
import SupportChat from '../support/SupportChat';
import { TrialBanner, UpgradeWall } from './TrialGate';
import WelcomeCelebration from './WelcomeCelebration';
import PhonePrompt from './PhonePrompt';
import BreachBanner from './BreachBanner';
import VerifyEmailBanner from './VerifyEmailBanner';
import Sidebar from './shell/Sidebar';
import AccountSwitcher from './shell/AccountSwitcher';
import GuardPill from './shell/GuardPill';
import GuardBand from './shell/GuardBand';
import AvatarMenu from './shell/AvatarMenu';
import { KillSwitchButton, KillSwitchModal } from './shell/KillSwitch';
import { IcMenu, IcBell, IcSliders, IcSearch } from './shell/icons';

/**
 * Dashboard shell.
 *
 *   sidebar (252px, off-canvas ≤ 900px)
 *   header  (sticky, blurred): burger · account switcher · guard pill ·
 *           spacer · Edit rules · Kill switch · search · bell · avatar
 *   guard band (only while something is wrong — never dismissible)
 *   banners · page
 *
 * Responsive tiers per the brief: ≤1040 hides search/Edit rules/pill;
 * ≤900 drawer; ≤700 single nowrap header row with the kill switch
 * collapsed to an icon (re-expands to the countdown when armed).
 */

function Shell() {
  const { user } = useAuth();
  const { theme } = useDashboardTheme();
  const { prefs } = usePrefs();
  const { unreadBreaches } = useGuard();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const [drawer, setDrawer] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [killNonce, setKillNonce] = useState(0);
  const killBtnRef = useRef(null);

  const billingArea = pathname.includes('/account') || pathname.includes('/billing');
  const locked = Boolean(user?.isExpired) && !billingArea;
  // §3.5 per-screen max-widths: Overview/Accounts/Plan 980 · Alerts/Security/Preferences 760–780
  const narrow = /\/dashboard\/(overview|account\/trading|account\/billing)$/.test(pathname);
  const tight = /\/dashboard\/(alerts|account\/security|preferences|account\/notifications)$/.test(pathname);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawer]);

  useEffect(() => {
    document.body.style.paddingTop = '';
    document.documentElement.style.removeProperty('--tg-promo-h');
  }, []);

  // <main> is the scroll container; reset it on route change (double rAF so
  // it lands after the auth re-render and the route's first paint).
  useEffect(() => {
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { mainRef.current?.scrollTo?.({ top: 0, left: 0 }); window.scrollTo?.(0, 0); });
    });
    return () => { cancelAnimationFrame(outer); if (inner) cancelAnimationFrame(inner); };
  }, [pathname]);

  return (
    <div
      data-tgx
      data-dash-theme={theme}
      data-theme={theme}
      data-accent={prefs.accent}
      data-chrome={prefs.chrome}
      data-density={prefs.density}
      className="dsh-root"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <aside className="dsh-side" data-tgx-aside data-open={drawer ? '1' : '0'}>
        <Sidebar onNavigate={() => setDrawer(false)} />
      </aside>
      <div className="ddr-scrim" data-tgx-scrim style={{ position: 'fixed', inset: 0, zIndex: 85, opacity: drawer ? 1 : 0, pointerEvents: drawer ? 'auto' : 'none' }} onClick={() => setDrawer(false)} />
      <div className="dsh-main">
        <header className="dsh-header">
          <div className="dsh-headbar" data-tgx-headbar>
            <button type="button" className="dsh-burger" data-tgx-burger onClick={() => setDrawer(true)} aria-label="Open menu"><IcMenu size={17} /></button>
            <AccountSwitcher />
            <GuardPill mdhide />
            <div className="dsh-spacer" />
            {!pathname.startsWith('/dashboard/rules') && (
              <Link to="/dashboard/rules" className="dsh-edit" data-tgx-mdhide><IcSliders size={15} stroke={1.8} />Edit rules</Link>
            )}
            <span ref={killBtnRef}>
              <KillSwitchButton onOpen={() => { setKillNonce((n) => n + 1); setKillOpen(true); }} />
            </span>
            <button type="button" className="dsh-search" data-tgx-mdhide aria-label="Search" onClick={() => navigate('/dashboard/trades')}>
              <IcSearch size={15} />Search<span className="dsh-search__k">⌘K</span>
            </button>
            <Link to="/dashboard/alerts" className="dsh-bell" aria-label={unreadBreaches ? `${unreadBreaches} unread alerts` : 'Alerts'}>
              <IcBell size={16} />
              {unreadBreaches > 0 && <span className="dsh-bell__dot" />}
            </Link>
            <AvatarMenu />
          </div>
        </header>

        <GuardBand />

        <main ref={mainRef} className="dsh-page">
          <div className={`dsh-page__inner${narrow ? ' dsh-page__inner--narrow' : ''}${tight ? ' dsh-page__inner--tight' : ''}`} data-tgx-main key={pathname}>
            <VerifyEmailBanner />
            <BreachBanner />
            <TrialBanner />
            {locked ? <UpgradeWall /> : <Outlet />}
          </div>
        </main>
      </div>

      <KillSwitchModal key={killNonce} open={killOpen} onClose={() => setKillOpen(false)} returnFocusRef={killBtnRef} />
      <WelcomeCelebration />
      <PhonePrompt />
      <SupportChat />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardThemeProvider>
      <PrefsProvider>
        <TradingAccountProvider>
          <GuardProvider>
            <Shell />
          </GuardProvider>
        </TradingAccountProvider>
      </PrefsProvider>
    </DashboardThemeProvider>
  );
}
