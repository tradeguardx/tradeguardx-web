import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useGuard } from '../../../context/GuardContext';
import { brokerLabel } from '../../../lib/labels';
import { IcChevron, IcCheck } from './icons';

/**
 * Account switcher — tag chip, label, venue underneath. Never a balance.
 * Switching rescopes the entire app (every screen reads the selected id).
 * Each row in the dropdown shows that account's own guard state.
 *
 * Chip keeps a 150px floor at narrow widths so the label never truncates
 * to "Del…".
 */

const TONE = { armed: 'mint', watching: 'amber', unprotected: 'red', locked: 'red' };
const WORD = { armed: 'Armed', watching: 'Alert only', unprotected: 'Not protected', locked: 'Locked' };

function tagOf(account) {
  const n = (account?.name || '').trim();
  if (!n) return '—';
  const parts = n.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : n.slice(0, 2)).toUpperCase();
}

export default function AccountSwitcher() {
  const { accounts, selectedAccount, setSelectedTradingAccountId } = useTradingAccounts();
  const guard = useGuard();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const venue = selectedAccount ? brokerLabel(selectedAccount.propFirmSlug) : null;
  const inProgress = selectedAccount && !selectedAccount.propFirmSlug;

  return (
    <div className="dsw" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="dsw-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dsw-tag">{tagOf(selectedAccount)}</span>
        <span className="dsw-text">
          <span className="dsw-label">{inProgress ? 'New account' : selectedAccount?.name ?? 'No account'}</span>
          <span className="dsw-venue">{inProgress ? 'Not created yet' : venue ?? 'Add one to begin'}</span>
        </span>
        <IcChevron size={14} className="dsw-chev" />
      </button>

      {open && (
        <div className="dsw-menu dsh-card" role="listbox" aria-label="Accounts">
          {accounts.map((a) => {
            const s = guard.stateFor(a.id);
            const active = a.id === selectedAccount?.id;
            const draft = !a.propFirmSlug;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`dsw-row${active ? ' dsw-row--active' : ''}`}
                onClick={() => { setSelectedTradingAccountId(a.id); setOpen(false); }}
              >
                <span className="dsw-tag">{tagOf(a)}</span>
                <span className="dsw-text">
                  <span className="dsw-label">{draft ? 'New account' : a.name}</span>
                  <span className="dsw-venue">{draft ? 'Not created yet' : brokerLabel(a.propFirmSlug)}</span>
                </span>
                <span className={`dsh-pill dsh-pill--${TONE[s.guard]}`}>{WORD[s.guard]}</span>
                {active && <IcCheck size={14} className="dsw-check" />}
              </button>
            );
          })}
          <Link to="/dashboard/account/trading" className="dsw-add" onClick={() => setOpen(false)}>
            + Add account
          </Link>
        </div>
      )}
    </div>
  );
}
