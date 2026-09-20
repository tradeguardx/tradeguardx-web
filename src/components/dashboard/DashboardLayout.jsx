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
import { IcMenu, IcClose, IcBell, IcRules, IcSearch } from './shell/icons';

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

function Drawer({ open, onClose }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll('a[href], button:not(:disabled)');
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.querySelector('a[href]')?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return (
    <div className={`ddr${open ? ' ddr--open' : ''}`} aria-hidden={!open}>
      <div className="ddr-scrim" onClick={onClose} />
      <div className="ddr-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Navigation">
        <button type="button" className="ddr-close dsh-btn dsh-btn--ghost dsh-btn--icon" onClick={onClose} aria-label="Close menu"><IcClose size={18} /></button>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}

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
  const killBtnRef = useRef(null);

  const billingArea = pathname.includes('/account') || pathname.includes('/billing');
  const locked = Boolean(user?.isExpired) && !billingArea;

  useEffect(() => {
    document.body.style.paddingTop = '';
    document.documentElement.style.removeProperty('--tg-promo-h');
  }, []);

  // <main> is the scroll container; reset it on route change (double rAF so
  // it lands after the auth re-render and the route's first paint).
  useEffect(() => {
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => { mainRef.current?.scrollTo({ top: 0, left: 0 }); window.scrollTo(0, 0); });
    });
    return () => { cancelAnimationFrame(outer); if (inner) cancelAnimationFrame(inner); };
  }, [pathname]);

  return (
    <div data-dash-theme={theme} data-density={prefs.density} className="dsh-root" style={{ backgroundColor: 'var(--bg)' }}>
      <aside className="dsh-side">
        <Sidebar />
      </aside>
      <Drawer open={drawer} onClose={() => setDrawer(false)} />

      <div className="dsh-main">
        <header className="dsh-header">
          <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--icon dsh-burger" onClick={() => setDrawer(true)} aria-label="Open menu"><IcMenu size={18} /></button>
          <AccountSwitcher />
          <GuardPill className="dsh-hide-1040" />
          <div className="dsh-spacer" />
          {!pathname.startsWith('/dashboard/rules') && (
            <Link to="/dashboard/rules" className="dsh-btn dsh-hide-1040"><IcRules size={15} />Edit rules</Link>
          )}
          <span ref={killBtnRef} className="dsh-kill-wrap">
            <KillSwitchButton onOpen={() => setKillOpen(true)} />
          </span>
          <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--icon dsh-hide-1040" aria-label="Search" onClick={() => navigate('/dashboard/trades')}><IcSearch size={17} /></button>
          <Link to="/dashboard/alerts" className="dsh-btn dsh-btn--ghost dsh-btn--icon dsh-bell" aria-label={unreadBreaches ? `${unreadBreaches} unread alerts` : 'Alerts'}>
            <IcBell size={17} />
            {unreadBreaches > 0 && <span className="dsh-bell__dot" />}
          </Link>
          <AvatarMenu />
        </header>

        <GuardBand />

        <main ref={mainRef} className="dsh-page">
          <div className="dsh-page__inner">
            <VerifyEmailBanner />
            <BreachBanner />
            <TrialBanner />
            {locked ? <UpgradeWall /> : <Outlet />}
          </div>
        </main>
      </div>

      <KillSwitchModal open={killOpen} onClose={() => setKillOpen(false)} returnFocusRef={killBtnRef} />
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
