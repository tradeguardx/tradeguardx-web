import { Outlet, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { to: '/dashboard/account', end: true, label: 'Overview' },
  { to: '/dashboard/account/billing', end: false, label: 'Billing' },
  { to: '/dashboard/account/trading', end: false, label: 'Trading accounts' },
];

export default function AccountLayout() {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--dash-text-primary)' }}>
          Account
        </h1>
        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--dash-text-muted)' }}>
          Subscription, payments, and trading accounts in one place.
        </p>
      </motion.div>

      <div
        className="flex flex-wrap gap-1 sm:gap-2 mb-8 border-b"
        style={{ borderColor: 'var(--dash-border)' }}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 sm:px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors rounded-t-lg ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent hover:text-[var(--dash-text-secondary)]'
              }`
            }
            style={({ isActive }) => (!isActive ? { color: 'var(--dash-text-muted)' } : undefined)}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
