import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useGuard } from '../../../context/GuardContext';
import { brokerLabel } from '../../../lib/labels';
import { sx } from './sx';

/** Account switcher — reference lines 305–329. Never a balance. */

function tagOf(account) {
  const n = (account?.name || '').trim();
  if (!n) return '—';
  const parts = n.split(/[\s·]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : n.slice(0, 2)).toUpperCase();
}

export default function AccountSwitcher() {
  const { accounts, selectedAccount, setSelectedTradingAccountId } = useTradingAccounts();
  const guard = useGuard();
  const navigate = useNavigate();
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

  const draft = selectedAccount && !selectedAccount.propFirmSlug;

  return (
    <div data-tgx-acctwrap="1" style={sx('position:relative;min-width:0')} ref={ref}>
      <button
        ref={btnRef}
        type="button"
        data-tgx-acct="1"
        className="dsw-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={sx('flex:none;display:flex;align-items:center;gap:10px;min-width:min(240px,100%);padding:7px 11px 7px 9px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);color:var(--ink);text-align:left;white-space:nowrap')}
      >
        <span style={sx("flex:none;width:25px;height:25px;border-radius:7px;background:var(--surface-3);border:1px solid var(--line);display:grid;place-items:center;font:600 10px/1 'JetBrains Mono',monospace;color:var(--ink-2)")}>{tagOf(selectedAccount)}</span>
        <span style={sx('flex:1;min-width:0')}>
          <span style={sx('display:block;font-size:13px;font-weight:600;letter-spacing:-.005em;white-space:nowrap')}>{draft ? 'New account' : selectedAccount?.name ?? 'No account'}</span>
          <span style={sx('display:block;font-size:11px;color:var(--ink-3);margin-top:2px;white-space:nowrap')}>{draft ? 'Not created yet' : selectedAccount ? brokerLabel(selectedAccount.propFirmSlug) : 'Add one to begin'}</span>
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--ink-faint)' }}><path d="M7 10l5 5 5-5" /></svg>
      </button>

      {open && (
        <div role="listbox" aria-label="Accounts" style={sx('position:absolute;top:calc(100% + 7px);left:0;width:340px;max-width:calc(100vw - 30px);padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow-pop);z-index:40;animation:tgxSlide .16s ease-out')}>
          <div style={sx('padding:8px 10px 6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);font-weight:600')}>Switch account — everything rescopes</div>
          {accounts.map((a) => {
            const s = guard.stateFor(a.id);
            const active = a.id === selectedAccount?.id;
            const isDraft = !a.propFirmSlug;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={active}
                className="dsw-row"
                onClick={() => { setSelectedTradingAccountId(a.id); setOpen(false); }}
                style={sx('width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border:0;border-radius:9px;text-align:left;color:var(--ink)', { background: active ? 'var(--surface-2)' : 'transparent' })}
              >
                <span style={sx('flex:none;width:8px;height:8px;border-radius:50%', { background: isDraft ? 'var(--ink-faint)' : `var(--${s.describe.tone}-solid)` })} />
                <span style={sx('flex:1;min-width:0')}>
                  <span style={sx('display:block;font-size:13px;font-weight:600')}>{isDraft ? 'New account' : a.name}</span>
                  <span style={sx('display:block;font-size:11px;color:var(--ink-3);margin-top:2px')}>{isDraft ? 'Not created yet' : s.describe.label}</span>
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => { setOpen(false); navigate('/dashboard/account/trading'); }} style={sx('width:100%;margin-top:4px;padding:9px 10px;border:0;border-top:1px solid var(--line);border-radius:0 0 9px 9px;background:transparent;color:var(--mint);font-size:12.5px;font-weight:600;text-align:left')}>Add or manage accounts →</button>
        </div>
      )}
    </div>
  );
}
