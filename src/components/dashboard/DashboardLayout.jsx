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
import BreachToast from './shell/BreachToast';
import VerifyEmailBanner from './VerifyEmailBanner';
import Sidebar from './shell/Sidebar';
import AccountSwitcher from './shell/AccountSwitcher';
import GuardPill from './shell/GuardPill';
import GuardBand from './shell/GuardBand';
import AvatarMenu from './shell/AvatarMenu';
import { KillSwitchButton, KillSwitchModal } from './shell/KillSwitch';
import { sx } from './shell/sx';

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
      data-tgx="1"
      data-dash-theme={theme}
      data-theme={theme}
      data-accent={prefs.accent}
      data-chrome={prefs.chrome}
      data-density={prefs.density}
      style={sx('display:flex;min-height:100vh;font-size:14px;line-height:1.45;background:var(--bg);color:var(--ink)')}
    >
      {drawer && <div data-tgx-scrim="1" onClick={() => setDrawer(false)} style={sx('position:fixed;inset:0;z-index:85;background:rgba(3,5,10,.6);backdrop-filter:blur(3px)')} />}
      <aside data-tgx-aside="1" data-open={drawer ? '1' : '0'} style={sx('flex:none;width:252px;border-right:1px solid var(--line);background:var(--bg-deep);display:flex;flex-direction:column;position:sticky;top:0;height:100vh')}>
        <Sidebar onNavigate={() => setDrawer(false)} />
      </aside>

      <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column')}>
        <header style={sx('position:sticky;top:0;z-index:20;background:var(--bg-header);backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border-bottom:1px solid var(--line)')}>
          <div data-tgx-headbar="1" style={sx('display:flex;align-items:center;gap:14px;padding:11px 24px')}>
            <button type="button" data-tgx-burger="1" onClick={() => setDrawer(true)} aria-label="Menu" style={sx('flex:none;place-items:center;width:36px;height:36px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);color:var(--ink-2)')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <AccountSwitcher />
            <GuardPill />
            <div style={{ flex: 1 }} />
            {!pathname.startsWith('/dashboard/rules') && (
              <Link to="/dashboard/rules" data-tgx-mdhide="1" className="hdr-edit" style={sx('flex:none;display:flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface-2);color:var(--ink);font-size:12.5px;font-weight:600;white-space:nowrap;text-decoration:none')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flex: 'none' }}><path d="M4 7h8M18 7h2M4 17h4M14 17h6" /><circle cx="15" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></svg>
                Edit rules
              </Link>
            )}
            <span ref={killBtnRef} style={{ display: 'contents' }}>
              <KillSwitchButton onOpen={() => { setKillNonce((n) => n + 1); setKillOpen(true); }} />
            </span>
            <button type="button" data-tgx-mdhide="1" className="hdr-search" aria-label="Search" onClick={() => navigate('/dashboard/trades')} style={sx('flex:none;display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-3);font-size:12.5px;white-space:nowrap')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" style={{ flex: 'none' }}><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></svg>
              <span style={sx("font:500 10.5px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:var(--ink-faint)")}>⌘K</span>
            </button>
            <Link to="/dashboard/alerts" className="hdr-bell" aria-label={unreadBreaches ? `${unreadBreaches} unread alerts` : 'Alerts'} style={sx('position:relative;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-3)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a5.2 5.2 0 00-5.2 5.2c0 5-2 6.3-2 6.3h14.4s-2-1.3-2-6.3A5.2 5.2 0 0012 4z" /><path d="M10.2 18.4a2 2 0 003.6 0" /></svg>
              {unreadBreaches > 0 && <span style={sx('position:absolute;top:6px;right:7px;width:6px;height:6px;border-radius:50%;background:var(--red-solid)')} />}
            </Link>
            <AvatarMenu />
          </div>
          <GuardBand />
        </header>

        <BreachToast />

        <main ref={mainRef} data-tgx-main="1" key={pathname} style={sx('flex:1;padding:26px 24px 64px;max-width:1240px;width:100%;animation:tgxSlide .22s ease-out', { maxWidth: narrow ? 980 : tight ? 780 : 1240 })}>
          <VerifyEmailBanner />
          <TrialBanner />
          {locked ? <UpgradeWall /> : <Outlet />}
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
