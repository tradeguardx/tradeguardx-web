/**
 * Settings: Alerts, Plan & billing and Security, shown as one page with tabs.
 *
 * Each tab keeps its own URL. Payment returns, lifecycle toasts, the avatar
 * menu and the command menu all link to these paths, so none of them move.
 * `id` is the lifecycle badge key (life.badges.plan etc.).
 */
export const SETTINGS_TABS = [
  { id: 'bell', to: '/dashboard/alerts', label: 'Alerts' },
  { id: 'plan', to: '/dashboard/account/billing', label: 'Plan & billing' },
  { id: 'security', to: '/dashboard/account/security', label: 'Security' },
];

export function isSettingsPath(pathname) {
  return SETTINGS_TABS.some((t) => pathname === t.to || pathname.startsWith(`${t.to}/`));
}
