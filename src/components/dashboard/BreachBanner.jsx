import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useDashboardTheme } from '../../context/DashboardThemeContext';
import { acknowledgeBreaches, fetchBreaches } from '../../api/breachesApi';

const POLL_INTERVAL_MS = 30_000;

/**
 * Theme-aware palette for severity badges.
 *
 * On light theme: dark, saturated text on a pale tinted background — high contrast,
 * meets AA contrast on white. Light theme uses amber-700 / red-700 for body text,
 * not the bright amber-400 / red-400 that's only legible on dark backgrounds.
 *
 * On dark theme: brighter accents that pop against the dark canvas.
 */
function severityStyles(severity, isDark) {
  if (severity === 'critical') {
    return {
      bg: isDark ? 'rgba(248, 113, 113, 0.10)' : 'rgba(239, 68, 68, 0.10)',
      border: isDark ? 'rgba(248, 113, 113, 0.45)' : 'rgba(220, 38, 38, 0.5)',
      text: isDark ? '#fecaca' : '#991b1b',     // red-200 / red-800
      labelBg: isDark ? 'rgba(248, 113, 113, 0.20)' : '#dc2626',
      labelFg: isDark ? '#fecaca' : '#ffffff',
      label: 'CRITICAL',
    };
  }
  if (severity === 'warning') {
    return {
      bg: isDark ? 'rgba(251, 191, 36, 0.10)' : 'rgba(245, 158, 11, 0.12)',
      border: isDark ? 'rgba(251, 191, 36, 0.45)' : 'rgba(217, 119, 6, 0.5)',
      text: isDark ? '#fde68a' : '#92400e',     // amber-200 / amber-800
      labelBg: isDark ? 'rgba(251, 191, 36, 0.20)' : '#d97706',
      labelFg: isDark ? '#fde68a' : '#ffffff',
      label: 'WARNING',
    };
  }
  return {
    bg: isDark ? 'rgba(0, 212, 170, 0.10)' : 'rgba(0, 170, 136, 0.12)',
    border: isDark ? 'rgba(0, 212, 170, 0.35)' : 'rgba(0, 170, 136, 0.5)',
    text: isDark ? '#a7f3d0' : '#065f46',       // emerald-200 / emerald-800
    labelBg: isDark ? 'rgba(0, 212, 170, 0.20)' : '#059669',
    labelFg: isDark ? '#a7f3d0' : '#ffffff',
    label: 'INFO',
  };
}

/**
 * Dashboard-wide banner showing unacknowledged risk-rule breaches.
 * Polls /breaches?unread=true every 30s; user can dismiss individually or all.
 */
export default function BreachBanner() {
  const { session } = useAuth();
  const { isDark } = useDashboardTheme();
  const accessToken = session?.access_token;
  const [breaches, setBreaches] = useState([]);
  const [dismissing, setDismissing] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('tgx-breach-collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('tgx-breach-collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const items = await fetchBreaches({ accessToken, unreadOnly: true, limit: 20 });
      // Drop informational trade-lifecycle events; banner is for risk-rule alerts only.
      // Those informational events still appear in Telegram per the dispatcher routing.
      const filtered = items.filter(
        (b) => b.breachType !== 'trade_opened' && b.breachType !== 'trade_closed',
      );
      setBreaches(filtered);
    } catch {
      // Silent — banner is non-critical UI. Backend errors are visible via other surfaces.
    }
  }, [accessToken]);

  useEffect(() => {
    load();
    if (!accessToken) return undefined;
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [accessToken, load]);

  const dismissOne = async (id) => {
    setDismissing(true);
    setBreaches((cur) => cur.filter((b) => b.id !== id));
    try {
      await acknowledgeBreaches({ accessToken, ids: [id] });
    } finally {
      setDismissing(false);
    }
  };

  const dismissAll = async () => {
    setDismissing(true);
    setBreaches([]);
    try {
      await acknowledgeBreaches({ accessToken, all: true });
    } finally {
      setDismissing(false);
    }
  };

  if (breaches.length === 0) return null;

  // Top (most recent) breach drives the collapsed-summary severity tint.
  const top = breaches[0];
  const styles = severityStyles(top.severity, isDark);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-4 rounded-2xl border"
        style={{
          backgroundColor: collapsed ? styles.bg : 'var(--dash-bg-raised)',
          borderColor: collapsed ? styles.border : 'var(--dash-border)',
        }}
        role="alert"
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={false}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
              style={{ backgroundColor: styles.labelBg, color: styles.labelFg }}
            >
              {styles.label}
            </span>
            <span className="text-sm font-semibold" style={{ color: styles.text }}>
              {breaches.length} unread risk alert{breaches.length === 1 ? '' : 's'}
            </span>
            <span
              className="ml-auto inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold"
              style={{ borderColor: styles.border, color: styles.text }}
            >
              Show
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
        ) : (
          <div className="px-4 py-3">
            {/* Header: count + bulk actions + collapse */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ backgroundColor: styles.labelBg, color: styles.labelFg }}
                >
                  {styles.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--dash-text-primary)' }}>
                  {breaches.length} unread risk alert{breaches.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {breaches.length > 1 && (
                  <button
                    type="button"
                    onClick={dismissAll}
                    disabled={dismissing}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}
                  >
                    Dismiss all
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: 'var(--dash-text-secondary)' }}
                >
                  Hide
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Full list of alerts, newest first */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {breaches.map((b) => {
                const s = severityStyles(b.severity, isDark);
                return (
                  <div
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="mt-0.5 shrink-0 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                        style={{ backgroundColor: s.labelBg, color: s.labelFg }}
                      >
                        {s.label}
                      </span>
                      <p className="text-sm leading-relaxed" style={{ color: s.text }}>
                        {b.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissOne(b.id)}
                      disabled={dismissing}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-50"
                      style={{ borderColor: s.border, color: s.text }}
                    >
                      Dismiss
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
