/**
 * Fees an exchange charged on a trade, when we know them.
 *
 * The engine settles each Delta close from its fills and records the fees in
 * the journal row's metadata. They are shown to the trader but never counted
 * in their loss limits (owner's decision, 25 Oct 2026): a $5 limit closes at
 * −$5 of the P&L the trader watches, and fees are charged on top. `pnl` stays
 * that price P&L; `net` is what actually left the wallet.
 */
export function tradeFees(trade) {
  const meta = trade?.metadata;
  const fees = Number(meta?.fees);
  if (!Number.isFinite(fees) || fees <= 0) return null;
  const net = Number(meta?.netPnl);
  return { fees, net: Number.isFinite(net) ? net : null };
}
