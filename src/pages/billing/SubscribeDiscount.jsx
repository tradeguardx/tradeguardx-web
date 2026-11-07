import { useState } from 'react';
import { sx } from '../../components/dashboard/shell/sx';
import { COUPON_REFUSAL } from '../../components/dashboard/billing/billingContent';
import { discountWording, offerLabel } from '../../lib/siteOffer';

/**
 * Above the Subscribe button on an ended plan: the offer that is on, and the
 * place to type a code. Prices on the page change from `discount`, not here.
 */
export default function SubscribeDiscount({ discount }) {
  const { offer, offerCode, coupon, setCoupon, typed, checked, refusal, apply, checking, best } = discount;
  const [open, setOpen] = useState(false);
  const showOffer = !typed && offerCode && best;

  return (
    <div style={sx('margin-top:14px;max-width:460px')}>
      {showOffer && (
        <div data-offer-chip style={sx('display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 12px;border-radius:12px;background:var(--mint-tint);box-shadow:inset 0 0 0 1px var(--mint-line);color:var(--mint);font-size:12.5px;font-weight:700;line-height:1.35')}>
          <span style={sx('flex:1 1 auto;min-width:0')}>{`${offerLabel(offer)} applied · ${discountWording(best)}`}</span>
          <span style={sx("font:700 11px/1 'JetBrains Mono',monospace;letter-spacing:.08em;padding:4px 7px;border-radius:6px;background:color-mix(in srgb, var(--mint-solid) 14%, transparent)")}>{offerCode}</span>
        </div>
      )}

      {open || coupon ? (
        <div style={sx('margin-top:10px')}>
          <label htmlFor="subscribe-coupon" style={sx('display:block;margin-bottom:6px;font-size:11.5px;color:var(--ink-faint)')}>Coupon code</label>
          <div style={sx('display:flex;gap:8px')}>
            <input
              id="subscribe-coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
              placeholder="Enter code"
              autoCapitalize="characters"
              spellCheck={false}
              style={sx("flex:1;min-width:0;min-height:44px;padding:11px 13px;border:0;border-radius:12px;background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line-input);color:var(--ink);font:600 13px/1 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase")}
            />
            <button
              type="button"
              onClick={apply}
              disabled={!typed || checking}
              style={sx(`flex:none;min-height:44px;padding:0 14px;border:0;border-radius:12px;background:var(--surface-3);box-shadow:inset 0 0 0 1px var(--line-strong);color:var(--ink);font-size:13px;font-weight:700;opacity:${!typed || checking ? 0.5 : 1}`)}
            >
              {checking ? 'Checking…' : 'Apply'}
            </button>
          </div>
          {!typed ? (
            <p style={sx('margin:7px 0 0;font-size:11.5px;line-height:1.45;color:var(--ink-faint)')}>
              {showOffer ? `A code you enter here replaces the ${offerLabel(offer).toLowerCase()}.` : 'Press Apply to see the new price.'}
            </p>
          ) : checked && best ? (
            <p style={sx('margin:7px 0 0;font-size:11.5px;line-height:1.45;color:var(--mint)')}>{`${discountWording(best)} applied.`}</p>
          ) : refusal ? (
            <p role="alert" style={sx(`margin:7px 0 0;font-size:11.5px;line-height:1.45;color:${refusal === 'UNSUPPORTED' || refusal === 'LOOKUP' ? 'var(--ink-faint)' : 'var(--red)'}`)}>
              {COUPON_REFUSAL[refusal] ?? COUPON_REFUSAL.UNKNOWN}
            </p>
          ) : (
            <p style={sx('margin:7px 0 0;font-size:11.5px;line-height:1.45;color:var(--ink-faint)')}>Press Apply to see the new price.</p>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} style={sx('margin-top:10px;padding:0;border:0;background:none;color:var(--ink-3);font-size:12px;font-weight:600;text-decoration:underline')}>
          Have a coupon?
        </button>
      )}
    </div>
  );
}
