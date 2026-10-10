/**
 * EVERY BANNER MESSAGE, IN ONE PLACE, IN ONE ORDER.
 *
 * The band under the top bar used to be assembled from three sources that
 * did not know about each other — the plan (lifecycle), the selected
 * account's condition (guard.js) and setup polish — and whichever happened
 * to be computed first led. So "No alert channel connected" sat on top of
 * "Trial cancelled. Your guard switches off on 15 Oct.", and the more
 * important fact read as a footnote.
 *
 * Now each possible message is a row with a rank. The band shows the top
 * one. Nothing else.
 *
 *   RANK  WHAT                                  WHY IT RANKS HERE
 *   10    plan off      pf te pe pg lf          nothing is protected, on any account
 *   20    setup         s0 s2 s3                nothing is protected yet
 *   30    locked        manual / rule lockout   you cannot trade this account now
 *   40    can't act     key read-only / failed / missing; account unfinished
 *                                                this account is not protected now
 *   50    no rules      0 rules switched on     protected by a plan, enforcing nothing
 *   60    plan ending   tc pc t6, no-card trial protected now, not after a date
 *   70    no alerts     no Telegram / email     not a banner: a suggestion in Overview
 *
 * Copy lives with its source — lifecycle.js for plan and setup, guard.js for
 * the account — so a sentence is still written once. This file decides only
 * which of them is said, and in what order.
 *
 * The plan's billing gap (guard.js `billing`) is not here when the lifecycle
 * state is known: ranks 10, 20 and 60 already say it, in the spec's words.
 */

import { subscriptionNotice } from '../components/dashboard/shell/subscriptionNotice';

export const RANK = {
  PLAN_OFF: 10,
  SETUP: 20,
  LOCKED: 30,
  CANT_ACT: 40,
  NO_RULES: 50,
  PLAN_ENDING: 60,
  NO_ALERTS: 70,
};

function fromBand(id, rank, b) {
  return {
    id,
    rank,
    tone: b.tone,
    title: b.title,
    body: b.body,
    cta: b.cta,
    to: b.to,
    dismissible: Boolean(b.dismissible),
    dismissDays: b.dismissDays ?? 1,
  };
}

function fromGap(gap, rank, tone) {
  return { id: `gap:${gap.key}`, rank, tone, title: gap.title, body: gap.body, cta: gap.cta, to: gap.to, dismissible: false };
}

/**
 * The banner messages that apply right now, most important first.
 *
 * @param {object}  p
 * @param {object|null} p.life      lifecycle view (null = unknown: old behaviour)
 * @param {object}  p.selected      the selected account's guard state
 * @param {object}  p.user          the signed-in user (plan fields)
 */
export function bandMessagesOf({ life, selected, user }) {
  const out = [];
  const g = selected ?? {};
  const gaps = Array.isArray(g.gaps) ? g.gaps : [];
  const gap = (k) => gaps.find((x) => x.key === k) ?? null;

  /* ── The plan ─────────────────────────────────────────────────────── */
  if (life?.unprotected && life.band) out.push(fromBand(`plan:${life.id}`, RANK.PLAN_OFF, life.band));
  if (life?.setup && life.band) out.push(fromBand(`setup:${life.id}`, RANK.SETUP, life.band));

  /*
   * The selected account. Skipped while the plan is off or setup is
   * unfinished: those already say "not protected", and a key or rules
   * problem on top is shown on Accounts and Connect key (spec §5).
   */
  const accountMatters = g.loaded && g.account && !(life?.unprotected || life?.setup);
  if (accountMatters) {
    const d = g.describe ?? {};
    if (g.guard === 'locked' && d.showBand) {
      out.push({ id: 'account:locked', rank: RANK.LOCKED, tone: 'red', title: d.bandTitle, body: d.bandBody, cta: d.cta, to: d.to, dismissible: false });
    }
    if (gap('setup')) out.push(fromGap(gap('setup'), RANK.CANT_ACT, 'red'));
    if (gap('key')) out.push(fromGap(gap('key'), RANK.CANT_ACT, 'red'));
    // Read-only key: the guard watches but cannot close.
    if (g.guard === 'watching' && g.readOnly && d.showBand) {
      out.push({ id: 'account:read-only', rank: RANK.CANT_ACT, tone: 'amber', title: d.bandTitle, body: d.bandBody, cta: d.cta, to: d.to, dismissible: false });
    }
    if (!gap('setup') && !gap('key') && gap('rules')) out.push(fromGap(gap('rules'), RANK.NO_RULES, 'red'));
    // Old API (no lifecycle state): the billing gap is the only plan signal.
    if (!life && gap('billing')) out.push(fromGap(gap('billing'), RANK.CANT_ACT, 'red'));
  }

  /* ── The plan, ending ─────────────────────────────────────────────── */
  if (life && !life.unprotected && !life.setup && life.band) {
    out.push(fromBand(`plan:${life.id}`, RANK.PLAN_ENDING, life.band));
  } else {
    // No-card trial (t1/t6 without a card), or an old API: the existing prompt.
    const noCardTrial = user?.isTrial && !user?.trialAutoRenews && !user?.subscriptionCanceled;
    const notice = !life || (noCardTrial && (life.id === 't1' || life.id === 't6')) ? subscriptionNotice(user) : null;
    if (notice) {
      out.push({ id: 'plan:notice', rank: RANK.PLAN_ENDING, tone: notice.tone, title: notice.strong, body: notice.text, cta: notice.cta, to: notice.to, dismissible: false });
    }
  }

  /* No alert channel is NOT a banner: enforcement works without it, so it
     is a suggestion, and suggestions live in Overview's "What to do next".
     RANK.NO_ALERTS stays as the record of where it would rank. */

  // Stable: equal ranks keep the order they were added in.
  return out.map((m, i) => ({ m, i })).sort((a, b) => a.m.rank - b.m.rank || a.i - b.i).map(({ m }) => m);
}
