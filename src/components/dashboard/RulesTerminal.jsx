import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardPageBanner, { DashboardSectionHeading } from './DashboardPageBanner';
import { staggerContainer, staggerItem } from './dashboardMotion';
import { useAuth } from '../../context/AuthContext';
import { useTradingAccounts } from '../../context/TradingAccountContext';
import { useDashboardTheme } from '../../context/DashboardThemeContext';
import { useToast } from '../common/ToastProvider';
import { ShimmerBlock } from '../common/LoadingSkeleton';
import { fetchRulesBundle, saveRuleInstance } from '../../api/rulesApi';

const RULE_VISUALS = {
  _default: {
    gradient: 'from-slate-500 to-slate-400',
    bgGlow: 'bg-slate-500/[0.06]',
    iconColor: 'text-slate-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  'daily-loss': {
    gradient: 'from-accent to-emerald-500',
    bgGlow: 'bg-accent/[0.07]',
    iconColor: 'text-accent',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  hedging: {
    gradient: 'from-rose-500 to-orange-400',
    bgGlow: 'bg-rose-500/[0.06]',
    iconColor: 'text-rose-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  'risk-per-trade': {
    gradient: 'from-blue-500 to-cyan-400',
    bgGlow: 'bg-blue-500/[0.06]',
    iconColor: 'text-blue-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'max-total-loss': {
    gradient: 'from-violet-500 to-purple-400',
    bgGlow: 'bg-violet-500/[0.06]',
    iconColor: 'text-violet-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  stacking: {
    gradient: 'from-amber-400 to-yellow-300',
    bgGlow: 'bg-amber-500/[0.06]',
    iconColor: 'text-amber-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  'max-trades-day': {
    gradient: 'from-teal-400 to-emerald-400',
    bgGlow: 'bg-teal-500/[0.06]',
    iconColor: 'text-teal-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  'close-after-losses': {
    gradient: 'from-pink-500 to-rose-400',
    bgGlow: 'bg-pink-500/[0.06]',
    iconColor: 'text-pink-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  'stop-loss-alert': {
    gradient: 'from-orange-500 to-amber-400',
    bgGlow: 'bg-orange-500/[0.06]',
    iconColor: 'text-orange-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  'minimum-hold': {
    gradient: 'from-cyan-500 to-sky-400',
    bgGlow: 'bg-cyan-500/[0.06]',
    iconColor: 'text-cyan-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'htf-minimum': {
    gradient: 'from-indigo-500 to-violet-400',
    bgGlow: 'bg-indigo-500/[0.06]',
    iconColor: 'text-indigo-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
      </svg>
    ),
  },
};

function buildFields(template, instance) {
  const raw = Array.isArray(template.definition?.fields) ? template.definition.fields : [];
  const cfg = instance?.config && typeof instance.config === 'object' && !Array.isArray(instance.config)
    ? instance.config
    : {};
  return raw.map((f) => ({
    ...f,
    value: Object.prototype.hasOwnProperty.call(cfg, f.key) ? cfg[f.key] : f.value,
  }));
}

/** Group rules by catalog plan tier (from API: minPlanSlug + section title). */
function groupRulesByPlanSection(rules) {
  const map = new Map();
  for (const r of rules) {
    const key = r.minPlanSlug ?? '__none';
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: r.planSectionTitle || 'Rules',
        sortOrder: r.planSectionSortOrder ?? 99,
        rules: [],
      });
    }
    map.get(key).rules.push(r);
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

function RuleCard({ rule, index, accessToken, tradingAccountId, onSaved }) {
  const toast = useToast();
  const { isDark } = useDashboardTheme();
  const [values, setValues] = useState(() =>
    rule.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {}),
  );
  /** Collapse new rules by default so template defaults are not mistaken for active config. */
  const [expanded, setExpanded] = useState(() => Boolean(rule.hasSavedInstance && !rule.locked));
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!accessToken || !tradingAccountId || rule.locked) return;
    setSaving(true);
    try {
      const config = { ...values };
      Object.keys(config).forEach((k) => {
        const field = rule.fields.find((x) => x.key === k);
        if (field?.type === 'number' && typeof config[k] === 'string' && config[k] !== '') {
          const n = Number(config[k]);
          if (!Number.isNaN(n)) config[k] = n;
        }
      });
      await saveRuleInstance({
        accessToken,
        tradingAccountId,
        templateSlug: rule.id,
        config,
        enabled: true,
      });
      toast.success('Saved', `${rule.name} updated.`);
      onSaved?.();
    } catch (e) {
      toast.error('Save failed', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-2xl border transition-all duration-300 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
        style={{
          borderColor: rule.locked ? 'var(--dash-border)' : 'var(--dash-border-hover)',
          backgroundColor: rule.locked ? 'var(--dash-bg-card)' : 'var(--dash-bg-raised)',
          boxShadow: 'var(--dash-shadow-card)',
        }}
      >
        {!rule.locked && (
          <div className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full ${rule.bgGlow} blur-3xl`} />
        )}

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center gap-4 text-left"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-transform group-hover:scale-105">
            {!rule.locked && (
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${rule.gradient} opacity-20`} />
            )}
            {rule.locked && (
              <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: 'var(--dash-bg-input)' }} />
            )}
            <span className={`relative ${rule.iconColor}`}>{rule.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--dash-text-primary)' }}>{rule.name}</h3>
              {!rule.locked && rule.hasSavedInstance && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-accent"
                  style={{ backgroundColor: isDark ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.08)', border: `1px solid rgba(0,212,170,${isDark ? '0.15' : '0.30'})` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_4px_rgba(0,212,170,0.6)]" />
                  Saved
                </span>
              )}
              {!rule.locked && !rule.hasSavedInstance && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-amber-400"
                  style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,${isDark ? '0.25' : '0.35'})` }}>
                  Not saved — defaults only
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--dash-text-muted)' }}>{rule.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {rule.locked && (
              <Link
                to="/pricing"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/10 to-emerald-500/10 border border-accent/15 text-accent text-xs font-semibold hover:from-accent/20 hover:to-emerald-500/15 transition-all"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Upgrade
              </Link>
            )}
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4"
              style={{ color: 'var(--dash-text-faint)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </button>

        <motion.div
          initial={false}
          animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--dash-border)' }}>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--dash-text-muted)' }}>{rule.description}</p>

            {!rule.locked && !rule.hasSavedInstance && (
              <div
                className="mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: isDark ? 'rgba(251,191,36,0.25)' : 'rgba(245,158,11,0.35)',
                  backgroundColor: isDark ? 'rgba(251,191,36,0.06)' : '#fffbeb',
                  color: 'var(--dash-text-secondary)',
                }}
              >
                <span className="font-semibold text-amber-400/95">Not active yet.</span>{' '}
                Numbers and toggles here are template suggestions. Nothing is applied to your account or extension until you save this rule.
              </div>
            )}

            <div className="space-y-3">
              {rule.fields.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium" style={{ color: 'var(--dash-text-secondary)' }}>{field.label}</label>

                  {rule.locked ? (
                    <span className="text-sm italic" style={{ color: 'var(--dash-text-faint)' }}>Upgrade to configure</span>
                  ) : field.type === 'toggle' ? (
                    <button
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                      className="relative w-14 h-8 rounded-full transition-all duration-300"
                      style={{ backgroundColor: values[field.key] ? undefined : 'var(--dash-toggle-track)' }}
                    >
                      {values[field.key] && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent to-emerald-400 shadow-sm shadow-accent/25" />
                      )}
                      <motion.span
                        animate={{ x: values[field.key] ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
                      />
                      <span className="sr-only">{values[field.key] ? 'Enabled' : 'Disabled'}</span>
                    </button>
                  ) : (
                    <div className="relative">
                      {field.prefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: 'var(--dash-text-muted)' }}>
                          {field.prefix}
                        </span>
                      )}
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={values[field.key]}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        className={`w-28 py-2.5 rounded-xl text-sm font-medium text-right focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/30 transition-all ${
                          field.prefix ? 'pl-7 pr-3' : 'px-3'
                        } ${field.suffix ? 'pr-11' : ''}`}
                        style={{
                          backgroundColor: 'var(--dash-bg-input)',
                          border: '1px solid var(--dash-border)',
                          color: 'var(--dash-text-primary)',
                        }}
                      />
                      {field.suffix && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 pl-1.5 text-sm pointer-events-none"
                          style={{ color: 'var(--dash-text-muted)' }}
                        >
                          {field.suffix}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!rule.locked && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-950 hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : rule.hasSavedInstance ? 'Save changes' : 'Save & enable'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function RulesTerminal() {
  const { session } = useAuth();
  const { isDark } = useDashboardTheme();
  const { accounts, accountsLoading, selectedTradingAccountId, selectedAccount } = useTradingAccounts();
  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !selectedTradingAccountId) {
      setBundle(null);
      setBundleLoading(false);
      return;
    }
    setBundleLoading(true);
    setLoadError('');
    try {
      const data = await fetchRulesBundle({
        accessToken: token,
        tradingAccountId: selectedTradingAccountId,
      });
      setBundle(data);
      setLoadError('');
      setReloadNonce((n) => n + 1);
    } catch (e) {
      setLoadError(e?.message || 'Could not load rules');
      setBundle(null);
    } finally {
      setBundleLoading(false);
    }
  }, [session?.access_token, selectedTradingAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  const instanceBySlug = useMemo(() => {
    const m = new Map();
    (bundle?.instances || []).forEach((i) => m.set(i.templateSlug, i));
    return m;
  }, [bundle]);

  const displayRules = useMemo(() => {
    if (!bundle?.templates?.length) return [];
    return bundle.templates.map((t) => {
      const vis = RULE_VISUALS[t.slug] || RULE_VISUALS._default;
      const inst = instanceBySlug.get(t.slug);
      return {
        id: t.slug,
        name: t.name,
        description: t.description,
        locked: !t.eligible,
        eligible: t.eligible,
        hasSavedInstance: Boolean(inst),
        fields: buildFields(t, inst),
        planSlugs: t.planSlugs,
        minPlanSlug: t.minPlanSlug,
        planSectionTitle: t.planSectionTitle,
        planSectionSortOrder: t.planSectionSortOrder,
        ...vis,
      };
    });
  }, [bundle, instanceBySlug]);

  const availableRules = displayRules.filter((r) => r.eligible);
  const lockedRules = displayRules.filter((r) => !r.eligible);
  const availableByPlan = useMemo(() => groupRulesByPlanSection(availableRules), [availableRules]);
  const lockedByPlan = useMemo(() => groupRulesByPlanSection(lockedRules), [lockedRules]);
  const savedEnabledCount = (bundle?.instances || []).filter((i) => i.enabled).length;

  const showRulesSkeleton =
    Boolean(session?.access_token) &&
    !loadError &&
    (accountsLoading || (Boolean(selectedTradingAccountId) && bundleLoading));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl"
    >
      <DashboardPageBanner
        accent="accent"
        title="Rules Terminal"
        subtitle="Rules on your plan are listed below. Values are suggestions until you save — only saved rules are stored and synced for your account."
        badge={(
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,170,0.5)]" />
            {bundle ? `${savedEnabledCount} saved` : '…'}
            <span style={{ color: 'var(--dash-text-faint)' }}>
              / {bundle?.maxRules != null ? `max ${bundle.maxRules}` : '—'}
            </span>
          </span>
        )}
      />

      {loadError && (
        <p className="mb-6 text-sm text-amber-400/90">{loadError}</p>
      )}

      {!accountsLoading && accounts.length > 0 && selectedAccount && (
        <div className="mb-6 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--dash-text-muted)' }}>
            Active account
          </p>
          <p className="text-xs" style={{ color: 'var(--dash-text-secondary)' }}>
            Rules apply to the account selected in the header. Switch there to configure another prop or platform.
          </p>
          {(selectedAccount.accountSize != null || selectedAccount.accountCurrency) && (
            <p className="mt-2 text-xs font-medium" style={{ color: 'var(--dash-text-primary)' }}>
              {selectedAccount.accountSize != null ? Number(selectedAccount.accountSize).toLocaleString() : '—'}
              {selectedAccount.accountCurrency ? ` ${selectedAccount.accountCurrency}` : ''}
            </p>
          )}
          <Link
            to="/dashboard/account/trading"
            className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
          >
            Manage accounts &amp; pairing
          </Link>
        </div>
      )}

      {session?.access_token && !accountsLoading && accounts.length === 0 && (
        <p className="mb-6 text-sm rounded-xl border px-4 py-3" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
          Add a trading account to save rules per prop or platform.{' '}
          <Link to="/dashboard/account/trading" className="font-semibold text-accent hover:underline">
            Trading accounts
          </Link>
        </p>
      )}

      {showRulesSkeleton ? (
        <>
          <p className="mb-6 text-sm" style={{ color: 'var(--dash-text-muted)' }}>
            {accountsLoading ? 'Loading trading accounts…' : 'Loading rules…'}
          </p>
          <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((k) => (
              <ShimmerBlock key={k} className="h-[92px] w-full rounded-2xl sm:h-[100px]" />
            ))}
          </div>
          <div className="mb-10 space-y-3">
            <ShimmerBlock className="h-5 w-40" />
            {[...Array(4)].map((_, i) => (
              <ShimmerBlock key={i} className="h-[88px] w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mb-8 grid grid-cols-3 gap-3 sm:gap-4"
          >
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md hover:shadow-accent/10 sm:p-5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/[0.08] blur-2xl" />
              <p className="relative text-2xl font-display font-bold text-accent sm:text-3xl">{availableRules.length}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>On your plan</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md sm:p-5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/[0.06] blur-2xl" />
              <p className="relative text-2xl font-display font-bold sm:text-3xl" style={{ color: 'var(--dash-text-secondary)' }}>{lockedRules.length}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>Upgrade to unlock</p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden rounded-2xl border p-4 transition-shadow duration-300 hover:shadow-md sm:p-5"
              style={{ borderColor: 'var(--dash-border)', backgroundColor: 'var(--dash-bg-raised)', boxShadow: 'var(--dash-shadow-card)' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/[0.08] blur-2xl" />
              <p className="relative text-2xl font-display font-bold text-emerald-400 sm:text-3xl">{bundle?.planSlug || '—'}</p>
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--dash-text-muted)' }}>Current plan</p>
            </motion.div>
          </motion.div>

          <div className="mb-10">
            <DashboardSectionHeading
              icon={(
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">✓</span>
              )}
            >
              Available on your plan
            </DashboardSectionHeading>
            <div className="space-y-8">
              {availableByPlan.map((section) => (
                <div key={section.key}>
                  {section.title && section.title !== 'Rules' && (
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                      style={{ color: 'var(--dash-text-muted)' }}
                    >
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-3">
                    {section.rules.map((rule, i) => (
                      <RuleCard
                        key={`${rule.id}-${reloadNonce}`}
                        rule={rule}
                        index={i}
                        accessToken={session?.access_token}
                        tradingAccountId={selectedTradingAccountId}
                        onSaved={load}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lockedRules.length > 0 && (
            <div className="mb-8">
              <DashboardSectionHeading
                icon={(
                  <svg className="h-4 w-4 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              >
                Upgrade to unlock
              </DashboardSectionHeading>
              <div className="space-y-8">
                {lockedByPlan.map((section) => (
                  <div key={`locked-${section.key}`}>
                    {section.title && section.title !== 'Rules' && (
                      <p
                        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                        style={{ color: 'var(--dash-text-muted)' }}
                      >
                        {section.title}
                      </p>
                    )}
                    <div className="space-y-3">
                      {section.rules.map((rule, i) => (
                        <RuleCard
                          key={`${rule.id}-${reloadNonce}`}
                          rule={rule}
                          index={i + availableRules.length}
                          accessToken={session?.access_token}
                          tradingAccountId={selectedTradingAccountId}
                          onSaved={load}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lockedRules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden rounded-2xl border"
              style={{ borderColor: isDark ? 'rgba(0,212,170,0.15)' : 'rgba(0,212,170,0.25)', backgroundColor: isDark ? 'transparent' : '#f0fdf9', boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,212,170,0.08)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-violet-500/[0.04] to-transparent" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/[0.1] blur-3xl" />
              <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-violet-500/[0.08] blur-3xl" />

              <div className="relative p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-emerald-500/15 ring-1 ring-accent/20">
                  <svg className="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: 'var(--dash-text-primary)' }}>Unlock {lockedRules.length} more rules</h3>
                <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
                  Higher plans include additional protection templates. Upgrade to configure them here.
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-emerald-400 text-surface-950 font-bold text-sm shadow-lg shadow-accent/20 transition-all hover:shadow-accent/30 hover:brightness-110"
                  >
                    View plans
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
