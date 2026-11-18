/**
 * Settings: Alerts and Security, shown as one page with tabs.
 *
 * Plan & billing used to be a third tab. It is its own sidebar item now
 * (owner, 19 Nov 2026): it is where people go to buy, and a purchase should
 * never be two clicks deep under "Settings".
 *
 *
 * Each tab keeps its own URL. Payment returns, lifecycle toasts, the avatar
 * menu and the command menu all link to these paths, so none of them move.
 * `id` is the lifecycle badge key (life.badges.plan etc.).
 */
export const SETTINGS_TABS = [
  { id: 'bell', to: '/dashboard/alerts', label: 'Alerts' },
  { id: 'security', to: '/dashboard/account/security', label: 'Security' },
];

export function isSettingsPath(pathname) {
  return SETTINGS_TABS.some((t) => pathname === t.to || pathname.startsWith(`${t.to}/`));
}
