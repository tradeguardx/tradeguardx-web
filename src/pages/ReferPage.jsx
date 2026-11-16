import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReferralMe } from '../api/referralApi';
import { useIsMobile } from '../hooks/useIsMobile';
import { sx } from '../components/dashboard/shell/sx';

/**
 * /dashboard/refer — Refer a friend.
 *
 * Everything on it comes from GET /payments/referral/me (REFERRAL_CONTRACT.md):
 * the link, the reward sizes, the hold, the yearly cap and the rewards. The
 * copy reads those numbers rather than restating them, so a change on the
 * server cannot leave the page promising something else.
 *
 * NO VERDICT BEFORE DATA. Until the response lands the page shows the shape
 * of itself and nothing else — never "0 friends", which on a slow connection
 * would tell a referrer their friends had not joined. A failed load says it
 * failed and offers a retry; it does not fall back to zeros either.
 */

const H3 = "margin:0;font:600 16.5px/1.2 'Space Grotesk',sans-serif;letter-spacing:-.018em";
const CARD = 'border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:var(--shadow-card)';
const MONO_LABEL = "font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)";
const BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:1px solid var(--line-strong);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12.5px;font-weight:700;text-decoration:none;cursor:pointer;white-space:nowrap';
const BTN_PRIMARY = 'display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 15px;border:1px solid var(--ink);border-radius:9px;background:var(--ink);color:var(--surface);font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap';

const PLAN_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function shortDate(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** What each status means to the referrer, in words. */
function statusText(r) {
  switch (r.status) {
    case 'sent': return { label: 'Sent', note: r.sentAt ? `on ${shortDate(r.sentAt)}` : '', fg: 'var(--mint)' };
    case 'due': return { label: 'Due', note: 'sending soon', fg: 'var(--amber)' };
    case 'pending': return { label: 'Pending', note: r.dueAt ? `due ${shortDate(r.dueAt)}` : '', fg: 'var(--ink-2)' };
    case 'void': return { label: 'Not eligible', note: '', fg: 'var(--ink-faint)' };
    default: return { label: r.status || '—', note: '', fg: 'var(--ink-2)' };
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand?.('copy');
    document.body.removeChild(el);
    return Boolean(ok);
  } catch {
    return false;
  }
}

function CopyButton({ text, label = 'Copy', primary = false, ariaLabel }) {
  const [state, setState] = useState('idle');
  useEffect(() => {
    if (state === 'idle') return undefined;
    const t = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
      style={sx(primary ? BTN_PRIMARY : BTN)}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}
    </button>
  );
}

function shareMessage(pct) {
  return `I use TradeGuardX to hold myself to my own loss limits. Sign up with my link and get ${pct}% off your first Pro payment:`;
}

/** WhatsApp, Telegram, X — plain links, so they work with nothing loaded. */
function shareLinks(link, pct) {
  const msg = shareMessage(pct);
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(link)}` },
  ];
}

function Skel({ h, w = '100%', r = 8, style }) {
  return (
    <div className="tgx-skel" aria-hidden="true" style={sx('position:relative;overflow:hidden;background:var(--surface-2)', { height: h, width: w, borderRadius: r, ...style })}>
      <span className="tgx-skel__sweep" />
    </div>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span style={sx('position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)')}>Loading your referrals…</span>
      <section style={sx(`padding:19px;margin-bottom:16px;${CARD}`)}>
        <Skel h={12} w="min(160px,50%)" />
        <Skel h={42} r={10} style={{ marginTop: 14 }} />
        <Skel h={34} w="min(320px,90%)" r={9} style={{ marginTop: 12 }} />
      </section>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:16px')}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={sx(`padding:16px;${CARD}`)}>
            <Skel h={9} w="55%" />
            <Skel h={24} w="45%" style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>
      <section style={sx(`padding:19px;${CARD}`)}>
        <Skel h={12} w="min(200px,60%)" />
        <Skel h={10} w="min(420px,95%)" style={{ marginTop: 14 }} />
        <Skel h={10} w="min(360px,80%)" style={{ marginTop: 8 }} />
      </section>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div style={sx(`padding:15px 16px;${CARD};min-width:0`)}>
      <div style={sx(MONO_LABEL)}>{label}</div>
      <div style={sx("margin-top:10px;font:600 24px/1 'Space Grotesk',sans-serif;letter-spacing:-.03em;color:var(--ink)")}>{value}</div>
      {note ? <div style={sx('margin-top:6px;font-size:12px;color:var(--ink-3)')}>{note}</div> : null}
    </div>
  );
}

function money(bucket) {
  return { count: Number(bucket?.count) || 0, inr: Number(bucket?.inr) || 0 };
}

function RewardsList({ rewards, isMobile }) {
  if (isMobile) {
    return (
      <div>
        {rewards.map((r) => {
          const s = statusText(r);
          return (
            <div key={r.id} data-testid="reward-row" style={sx('padding:14px 16px;border-bottom:1px solid var(--line)')}>
              <div style={sx('display:flex;align-items:baseline;gap:10px')}>
                <span style={sx('flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--ink)')}>{r.friend}</span>
                <span style={sx('font-size:13.5px;font-weight:700;color:var(--ink)')}>{inr(r.amountInr)}</span>
              </div>
              <div style={sx('margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px;color:var(--ink-3)')}>
                <span>{PLAN_LABEL[r.plan] ?? r.plan}</span>
                <span style={{ color: s.fg, fontWeight: 600 }}>{s.label}{s.note ? ` · ${s.note}` : ''}</span>
              </div>
              {r.status === 'sent' && r.voucherCode ? (
                <div style={sx('margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                  <code style={sx("font:600 12.5px/1.3 'JetBrains Mono',monospace;color:var(--ink);word-break:break-all;flex:1;min-width:0")}>{r.voucherCode}</code>
                  <CopyButton text={r.voucherCode} ariaLabel={`Copy voucher code for ${r.friend}`} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
  const TH = "padding:10px 16px;text-align:left;font:600 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);border-bottom:1px solid var(--line)";
  const TD = 'padding:13px 16px;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink-2);vertical-align:middle';
  return (
    <table style={sx('width:100%;border-collapse:collapse')}>
      <thead>
        <tr>
          <th style={sx(TH)}>Friend</th>
          <th style={sx(TH)}>Plan</th>
          <th style={sx(TH)}>Voucher</th>
          <th style={sx(TH)}>Status</th>
          <th style={sx(TH)}>Code</th>
        </tr>
      </thead>
      <tbody>
        {rewards.map((r) => {
          const s = statusText(r);
          return (
            <tr key={r.id} data-testid="reward-row">
              <td style={sx(TD, 'color:var(--ink);font-weight:600')}>{r.friend}</td>
              <td style={sx(TD)}>{PLAN_LABEL[r.plan] ?? r.plan}</td>
              <td style={sx(TD, 'color:var(--ink);font-weight:600')}>{inr(r.amountInr)}</td>
              <td style={sx(TD)}>
                <span style={{ color: s.fg, fontWeight: 600 }}>{s.label}</span>
                {s.note ? <span style={sx('color:var(--ink-3)')}> · {s.note}</span> : null}
              </td>
              <td style={sx(TD)}>
                {r.status === 'sent' && r.voucherCode ? (
                  <span style={sx('display:inline-flex;align-items:center;gap:8px')}>
                    <code style={sx("font:600 12.5px/1.3 'JetBrains Mono',monospace;color:var(--ink)")}>{r.voucherCode}</code>
                    <CopyButton text={r.voucherCode} ariaLabel={`Copy voucher code for ${r.friend}`} />
                  </span>
                ) : <span style={sx('color:var(--ink-faint)')}>—</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ReferPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const isMobile = useIsMobile(640);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canShare] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    getReferralMe({ accessToken: token })
      .then((res) => { if (!cancelled) { if (res?.link) setData(res); else setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [token, attempt]);

  const retry = useCallback(() => { setFailed(false); setData(null); setAttempt((n) => n + 1); }, []);

  const header = (
    <div style={sx('margin-bottom:16px')}>
      <h1 style={sx("margin:0;font:600 29px/1.08 'Space Grotesk',sans-serif;letter-spacing:-.035em")}>Refer a friend</h1>
      <p style={sx('margin:6px 0 0;font-size:13.5px;color:var(--ink-3);max-width:70ch')}>Share your link. Your friend pays less for Pro, and you get an Amazon voucher when they pay.</p>
    </div>
  );

  if (!data) {
    return (
      <div style={sx('max-width:860px')}>
        {header}
        {failed ? (
          <section role="alert" style={sx(`padding:18px 19px;${CARD};display:flex;align-items:center;gap:12px;flex-wrap:wrap`)}>
            <span style={sx('flex:1;min-width:min(220px,100%);font-size:13px;color:var(--ink-2)')}>We couldn&rsquo;t load your referral link just now.</span>
            <button type="button" onClick={retry} style={sx(BTN)}>Try again</button>
          </section>
        ) : <LoadingState />}
      </div>
    );
  }

  const pct = Number(data.friendDiscountPct) || 0;
  const tiers = data.rewardsInr ?? {};
  const hold = Number(data.holdDays) || 0;
  const cap = Number(data.annualCapInr) || 0;
  const earned = Number(data.earnedThisFyInr) || 0;
  const stats = data.stats ?? {};
  const pending = money(stats.pending);
  const due = money(stats.due);
  const sent = money(stats.sent);
  const rewards = Array.isArray(data.rewards) ? data.rewards : [];
  const joined = Number(stats.joined) || 0;
  const capPct = cap > 0 ? Math.min(100, Math.round((earned / cap) * 100)) : 0;
  const capLeft = Math.max(0, cap - earned);

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'TradeGuardX', text: shareMessage(pct), url: data.link });
    } catch { /* dismissed */ }
  };

  return (
    <div style={sx('max-width:860px;min-width:0')}>
      {header}

      {/* The link */}
      <section style={sx(`padding:18px 19px;margin-bottom:16px;${CARD}`)}>
        <div style={sx(MONO_LABEL)}>Your link</div>
        <div style={sx('margin-top:11px;display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
          <div data-testid="referral-link" style={sx("flex:1;min-width:min(240px,100%);padding:11px 13px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface-2);color:var(--ink);font:500 13px/1.3 'JetBrains Mono',monospace;overflow-wrap:anywhere")}>{data.link}</div>
          <CopyButton text={data.link} label="Copy link" primary ariaLabel="Copy link" />
        </div>
        <div style={sx('margin-top:12px;display:flex;gap:8px;flex-wrap:wrap')}>
          {shareLinks(data.link, pct).map((s) => (
            <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" style={sx(BTN)}>{s.label}</a>
          ))}
          {canShare ? <button type="button" onClick={nativeShare} style={sx(BTN)}>More…</button> : null}
        </div>
        {data.code ? <p style={sx('margin:12px 0 0;font-size:12px;color:var(--ink-3)')}>Your code is <strong style={sx("color:var(--ink);font-family:'JetBrains Mono',monospace")}>{data.code}</strong>. It works on any page of the site.</p> : null}
      </section>

      {/* How it works */}
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;margin-bottom:16px')}>
        <section style={sx(`padding:17px 19px;${CARD}`)}>
          <h3 style={sx(H3)}>Your friend gets</h3>
          <p style={sx('margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--ink-2)')}>
            <strong style={sx('color:var(--ink)')}>{pct}% off their first Pro payment</strong> — or the current offer if it&rsquo;s bigger. They never pay more for using your link.
          </p>
        </section>
        <section style={sx(`padding:17px 19px;${CARD}`)}>
          <h3 style={sx(H3)}>You get</h3>
          <p style={sx('margin:8px 0 0;font-size:13px;line-height:1.6;color:var(--ink-2)')}>
            An Amazon voucher of <strong style={sx('color:var(--ink)')}>{inr(tiers.monthly)} / {inr(tiers.quarterly)} / {inr(tiers.yearly)}</strong> when your friend picks monthly, quarterly or yearly Pro. Sent {hold} days after they pay, up to {inr(cap)} per financial year.
          </p>
          <p style={sx('margin:8px 0 0;font-size:12px;line-height:1.55;color:var(--ink-3)')}>The ₹199 3-day pass and renewals don&rsquo;t count. One reward per friend. <Link to="/terms" style={sx('color:var(--mint);font-weight:600;text-decoration:none')}>Full rules</Link></p>
        </section>
      </div>

      {/* Stats */}
      <div data-testid="referral-stats" style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:16px')}>
        <Stat label="Friends joined" value={String(joined)} />
        <Stat label="Paid" value={String(Number(stats.paid) || 0)} />
        <Stat label="Pending" value={inr(pending.inr)} note={`${pending.count} waiting ${hold} days`} />
        <Stat label="Due" value={inr(due.inr)} note={`${due.count} to send`} />
        <Stat label="Sent" value={inr(sent.inr)} note={`${sent.count} voucher${sent.count === 1 ? '' : 's'}`} />
      </div>

      {/* Financial-year cap */}
      {cap > 0 ? (
        <section style={sx(`padding:16px 19px;margin-bottom:16px;${CARD}`)}>
          <div style={sx('display:flex;align-items:baseline;gap:10px;flex-wrap:wrap')}>
            <h3 style={sx(H3, 'flex:1;min-width:min(200px,100%)')}>This financial year{data.fy ? ` (${data.fy})` : ''}</h3>
            <span style={sx('font-size:13px;color:var(--ink-2)')}><strong style={sx('color:var(--ink)')}>{inr(earned)}</strong> of {inr(cap)}</span>
          </div>
          <div role="progressbar" aria-label="Vouchers this financial year" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={earned} style={sx('margin-top:12px;height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden')}>
            <div style={sx('height:100%;border-radius:999px;background:var(--mint-solid)', { width: `${capPct}%` })} />
          </div>
          <p style={sx('margin:9px 0 0;font-size:12px;color:var(--ink-3)')}>
            {capLeft > 0 ? `${inr(capLeft)} left before the yearly limit. The year runs April to March.` : 'You’ve reached the yearly limit. It resets on 1 April.'}
          </p>
        </section>
      ) : null}

      {/* Rewards */}
      <section style={sx(`${CARD};overflow:hidden`)}>
        <div style={sx('padding:16px 19px;border-bottom:1px solid var(--line)')}>
          <h3 style={sx(H3)}>Rewards</h3>
        </div>
        {rewards.length === 0 ? (
          <div data-testid="referral-empty" style={sx('padding:22px 19px;font-size:13px;line-height:1.6;color:var(--ink-2);max-width:70ch')}>
            {joined > 0
              ? `${joined} friend${joined === 1 ? ' has' : 's have'} joined with your link. A reward shows up here when one of them pays for Pro.`
              : 'No rewards yet. Share your link — when a friend signs up with it and pays for Pro, the reward shows up here.'}
          </div>
        ) : (
          <div style={sx('overflow-x:auto')}>
            <RewardsList rewards={rewards} isMobile={isMobile} />
          </div>
        )}
      </section>
    </div>
  );
}
