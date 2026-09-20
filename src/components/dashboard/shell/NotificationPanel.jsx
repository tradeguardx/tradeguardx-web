import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTradingAccounts } from '../../../context/TradingAccountContext';
import { useGuard } from '../../../context/GuardContext';
import { fetchBreaches, acknowledgeBreaches } from '../../../api/breachesApi';
import { sx } from './sx';

/**
 * The bell. A toast is a moment; this is the record — every rule fire and
 * enforcement event across the user's accounts, newest first, unread ones
 * marked until opened. Reads the same /breaches endpoint as the toast and
 * acknowledges through the same call, so the badge, the toast and this list
 * never disagree.
 */
const LIMIT = 40;
const POLL_MS = 60_000;

function when(iso) {
  try {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return d.toLocaleString('en-IN', { ...(sameDay ? {} : { day: 'numeric', month: 'short' }), hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  } catch { return ''; }
}
function ruleName(b) {
  const raw = b.ruleSlug || b.breachType || 'Rule';
  return String(raw).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
function toneOf(b) {
  const s = String(b.severity || '').toLowerCase();
  if (s === 'critical' || s === 'high') return 'red';
  if (s === 'warning' || s === 'medium') return 'amber';
  return 'mint';
}

export default function NotificationPanel() {
  const { session } = useAuth();
  const { accounts } = useTradingAccounts();
  const { unreadBreaches, refresh } = useGuard();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const accessToken = session?.access_token;
  const nameOf = (id) => accounts.find((a) => a.id === id)?.name || '';

  const load = useCallback(async (signal) => {
    if (!accessToken) return;
    try {
      const list = await fetchBreaches({ accessToken, limit: LIMIT, signal });
      if (!signal?.aborted) setItems(list || []);
    } catch { if (!signal?.aborted) setItems((cur) => cur ?? []); }
  }, [accessToken]);

  useEffect(() => {
    if (!open) return undefined;
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => load(ctrl.signal), POLL_MS);
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { ctrl.abort(); clearInterval(id); document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, load]);

  const openItem = async (b) => {
    setOpen(false);
    if (!b.acknowledgedAt) {
      setItems((cur) => (cur ?? []).map((x) => (x.id === b.id ? { ...x, acknowledgedAt: new Date().toISOString() } : x)));
      acknowledgeBreaches({ accessToken, ids: [b.id] }).then(() => refresh()).catch(() => {});
    }
    navigate(b.tradeUid ? `/dashboard/trades/${encodeURIComponent(b.tradeUid)}` : '/dashboard/live');
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await acknowledgeBreaches({ accessToken, all: true });
      setItems((cur) => (cur ?? []).map((x) => (x.acknowledgedAt ? x : { ...x, acknowledgedAt: new Date().toISOString() })));
      await refresh();
    } catch { /* the badge will catch up on the next poll */ } finally { setBusy(false); }
  };

  return (
    <div ref={ref} style={sx('position:relative;flex:none')}>
      <button type="button" className="hdr-bell" aria-haspopup="dialog" aria-expanded={open} aria-label={unreadBreaches ? `${unreadBreaches} unread notifications` : 'Notifications'} onClick={() => setOpen((o) => !o)} style={sx('position:relative;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink-3)', open ? { borderColor: 'var(--line-strong)', color: 'var(--ink)' } : {})}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4a5.2 5.2 0 00-5.2 5.2c0 5-2 6.3-2 6.3h14.4s-2-1.3-2-6.3A5.2 5.2 0 0012 4z" /><path d="M10.2 18.4a2 2 0 003.6 0" /></svg>
        {unreadBreaches > 0 && <span style={sx('position:absolute;top:6px;right:7px;width:6px;height:6px;border-radius:50%;background:var(--red-solid)')} />}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" data-tgx-notifpanel="1" style={sx('position:absolute;top:calc(100% + 8px);right:0;z-index:60;width:400px;max-width:calc(100vw - 30px);border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow-pop);overflow:hidden;animation:tgxSlide .16s ease-out')}>
          <div style={sx('display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line)')}>
            <span style={sx("font:600 14px/1.2 'Space Grotesk',sans-serif")}>Notifications</span>
            {unreadBreaches > 0 && <span style={sx("font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.1em;padding:4px 7px;border-radius:999px;background:var(--red-tint);color:var(--red)")}>{unreadBreaches} NEW</span>}
            <span style={{ flex: 1 }} />
            {unreadBreaches > 0 && <button type="button" disabled={busy} onClick={markAll} style={sx('padding:0;border:0;background:none;font-size:12px;font-weight:600;color:var(--ink-3);text-decoration:underline')}>{busy ? 'Marking…' : 'Mark all read'}</button>}
          </div>

          <div style={sx('max-height:min(60vh,520px);overflow-y:auto')}>
            {items === null ? (
              [0, 1, 2].map((i) => <div key={i} style={sx('height:64px;border-bottom:1px solid var(--line);background:var(--surface-2);animation:tgxPulse 1.4s ease-in-out infinite')} />)
            ) : items.length === 0 ? (
              <div style={sx('padding:34px 20px;text-align:center')}>
                <div style={sx('font-size:13.5px;font-weight:600')}>Nothing yet</div>
                <p style={sx('margin:6px auto 0;font-size:12.5px;line-height:1.55;color:var(--ink-3);max-width:34ch')}>When a rule fires or the guard acts, it lands here and stays — the toast is only the first look.</p>
              </div>
            ) : items.map((b) => {
              const unread = !b.acknowledgedAt; const tone = toneOf(b); const acct = nameOf(b.tradingAccountId);
              return (
                <button key={b.id} type="button" className="ntf-row" onClick={() => openItem(b)} style={sx('width:100%;display:flex;align-items:flex-start;gap:11px;padding:12px 16px;border:0;border-bottom:1px solid var(--line);text-align:left;color:var(--ink)', { background: unread ? `var(--${tone}-tint)` : 'transparent' })}>
                  <span style={sx('flex:none;width:8px;height:8px;border-radius:50%;margin-top:6px', { background: unread ? `var(--${tone}-solid)` : 'var(--surface-3)' })} aria-hidden />
                  <span style={sx('flex:1;min-width:0')}>
                    <span style={sx('display:flex;align-items:baseline;gap:8px')}>
                      <span style={sx('flex:1;min-width:0;font-size:13px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', { fontWeight: unread ? 700 : 600 })}>{ruleName(b)}{acct ? ` · ${acct}` : ''}</span>
                      <span style={sx('flex:none;font-size:11px;color:var(--ink-faint);font-variant-numeric:tabular-nums')}>{when(b.createdAt)}</span>
                    </span>
                    <span style={sx('display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:3px;font-size:12.5px;line-height:1.5;color:var(--ink-2)')}>{b.message}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:var(--surface-2);border-top:1px solid var(--line)')}>
            <span style={sx('font-size:11.5px;color:var(--ink-3)')}>Every rule fire, across all your accounts.</span>
            <Link to="/dashboard/alerts" onClick={() => setOpen(false)} style={sx('font-size:12px;font-weight:700;color:var(--mint);text-decoration:none;white-space:nowrap')}>Alert settings →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
