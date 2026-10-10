# Dashboard messages

Every message the dashboard shows about protection, plan and setup: where it appears, when, and what outranks what.

**Where the words live in code**
- **Plan and setup copy:** `src/lib/lifecycle.js`, one entry per lifecycle case.
- **Account copy** (key, rules, alerts, lock): `src/lib/guard.js`.
- **Which banner wins:** `src/lib/messages.js`.
- **Plan & billing copy:** `src/pages/billing/billingCopy.js`.

**Change a sentence in its source file, then update this page.**

**The rule above all:** never say "protected" when the engine isn't acting, and never say "not protected" when it is. Protection comes from the server (`/me` → `state`, `protected`). The UI never works it out on its own.

---

## 1. The cases

Every user is in exactly one case. They're checked in this order, and the first match wins:

1. No trading account → `s0`
2. Selected account's key never connected → `s2`
3. No plan yet → `s3`
4. Otherwise, the plan case.

| Case | Meaning | Protected |
|---|---|---|
| `s0` | Signed up, no account | no |
| `s2` | Key not connected | no |
| `s3` | Key on, no trial yet | no |
| `t1` | Trial running (more than 2 days left) | yes |
| `t6` | Trial ending (2 days or less) | yes |
| `tc` | Trial cancelled, inside the trial | yes |
| `tx` | Trial over, charge confirming (up to 3 days) | yes |
| `p` | Pro, active | yes |
| `pf` | Payment failed | no |
| `pc` | Pro cancelled, inside the paid period | yes |
| `te` | Trial ended, never paid | no |
| `pe` | Pro ended | no |
| `pg` | Closed after all retries failed (not produced until `end_reason` exists) | no |
| `ac` | Admin complimentary | yes |
| `lf` | Legacy free row (never shown as "Free") | no |
| `nr` | No subscription row (data problem) | yes |

---

## 2. The banner (one at a time)

The band under the top bar shows **only the highest-ranked message**. One banner, one action. It is hidden on Plan & billing and in onboarding. A message whose button points at the page you're already on drops out, and the next one takes its place.

| Rank | Message | When | Tone | Button | Dismissible |
|---|---|---|---|---|---|
| 10 | **Payment failed. Your guard is off.** "Nothing is protecting your accounts until the payment goes through. Pay ₹1,299 to switch it back on now." | `pf` | red | Pay ₹1,299 | no |
| 10 | **Your free trial has ended.** "Nothing is protecting your accounts. Your rules are saved." | `te` | red | Subscribe | no |
| 10 | **Your plan ended on {date}.** (same body) | `pe` | red | Subscribe | no |
| 10 | **Pro ended. All payment retries failed.** "…Pay ₹1,299 to switch everything back on." | `pg` | red | Pay ₹1,299 | no |
| 10 | **Your account has no active plan.** "…Subscribe to switch your guard on." | `lf` | red | Subscribe | no |
| 20 | **Finish setup to switch your guard on.** "About three minutes. Until then nothing is watching your trades." | `s0` | grey | Continue setup | no |
| 20 | **Nothing is watching {account} yet.** "Connect the key to turn your rules into actions." | `s2` | red | Connect key | no |
| 20 | **Key connected. Guard is off.** "Start your 7-day free trial to switch it on. ₹0 today." | `s3` | amber | Start free trial | no |
| 30 | **This account cannot trade until the lockout expires** | account locked (manual or by a rule) | red | See the countdown | no |
| 40 | **This account is not set up yet** | account missing venue or balance | red | Finish setup | no |
| 40 | **No key with trading scope** | key failed or revoked (plan protected) | red | Connect the key | no |
| 40 | **Read-only key — the killswitch is not live on this account** | key can read but not trade | amber | Replace the key | no |
| 50 | **No rules are switched on** "…there is simply nothing for the engine to enforce." | 0 rules on | red | Choose rules | no |
| 60 | **Trial cancelled. You won't be charged.** "Full protection until {date}. After that your guard switches off." | `tc` | amber | Resume trial | no |
| 60 | **Pro ends {date}.** "After that your guard switches off. Nothing is deleted." | `pc` | amber | Resume Pro | for 3 days |
| 60 | **Your trial ends {date}.** "We'll charge ₹1,299. Nothing to do if you're staying." | `t6` with a card | grey | Manage plan | for the day |
| 60 | **Your free trial has ended.** "Your guard stays on until {date}. Set up billing to keep it on." | `tx` without a card (old trial) | amber | Set up billing | no |
| 60 | **Free trial — everything unlocked.** "{n} days left. Set up payment to keep access when it ends." | `t1`/`t6` without a card (old trial) | mint | Set up | no |
| — | *No alert channel* is **not a banner**. Enforcement works without it, so it's a suggestion: the first item in Overview's "What to do next". | | | | |

**Silences, on purpose**
- **Each fact is said once on a screen.** The banner carries the action, the hero carries the status, and the setup card only shows while a *required* step (account, key, billing, rules) is undone. It's also hidden while the plan is off, because the banner already says so.
- **Plan off or still in setup:** account problems (key, rules, alerts) are not shown in the band. The plan message already says "not protected", and those problems appear on Accounts and Connect key instead.
- **The billing gap (`guard.js`):** never shown when the case is known, because ranks 10, 20 and 60 already say it.
- **`t1` with a card, `tx` with a card, `p`, `ac`, `nr`:** no banner. A calm, protected state shows no billing nags.

---

## 3. The pill (top bar)

The precedence order:
1. Switching moment (not built yet, see §9).
2. Plan off or setup.
3. This account's own problem.
4. Protected.

| Case | Pill | Tone |
|---|---|---|
| `s0` | Set up · 0 of 4 | grey |
| `s2` | Not protected | red |
| `s3` | Guard off | amber |
| `pf` | Not protected · payment failed | red |
| `te` `pe` `pg` | Not protected · plan ended | red |
| `lf` | Not protected · no plan | red |
| `tc` `pc` (armed) | Protected · until {date} | amber |
| `tx` (armed, card) | Protected · confirming payment | mint |
| `t1` `t6` `p` `ac` `nr` (armed) | Armed | mint |
| any protected case, account not armed | the account's own state: Not protected / Watching only / Locked | red / amber / red |

---

## 4. Overview hero

The hero follows the pill. A plan's own wording is shown only while the account is armed, or when the plan is off.

| Case | Title | Sub |
|---|---|---|
| `pf` | Nothing is protecting your accounts. | Your bank declined ₹1,299 on {date}, so the guard switched off. Pay now and your saved rules start enforcing again straight away. |
| `te` `pe` | Nothing is protecting your accounts. | Your rules are saved but not enforced. Trades and tax history stay readable. Subscribe and the guard is back on immediately. |
| `pg` | Nothing is protecting your accounts. | …Pay ₹1,299 and the guard is back on immediately. |
| `lf` | Nothing is protecting your accounts. | Your account is from before plans changed. Subscribe and your saved rules start enforcing straight away. |
| `tc` `pc` (armed) | Protected until {date}. | After that your guard switches off on every account… |
| `tx` (armed, card) | {account} is protected. | Your trial ended and we're confirming the first payment with your bank… up to 3 days. |
| otherwise | the account's own description (Armed / Not protected / Watching only / Locked) | |

**When the plan is off or in setup, the rest of Overview changes too:**
- **Dial:** "Off", labelled "guard off · payment failed", "guard off · no active plan" or "guard off · finish setup".
- **Facts:** Rules · Trades · Tax history (plan off), or Rules · Key · Guard (setup).
- **Loss budget:** "—", with "Not enforced: …".
- **Activity:** the first row is "Guard switched off: {reason}".
- **Share cards:** hidden.

---

## 5. Page locks

The page renders blurred underneath, with one card and one button. The button carries `?return=`, so the user comes back here after paying.

| Case | Locked pages | Title | Button |
|---|---|---|---|
| `s0` | Live guard, Journal, All trades, Tax | Connect your key to see this | Continue setup |
| `s2` | Live guard, Journal, All trades, Tax | Connect your key to see this | Connect key |
| `s3` | Live guard, Journal | Starts with your free trial | Start free trial |
| `pf` | Live guard, Journal | Off until your payment goes through | Pay ₹1,299 |
| `te` `pe` `lf` | Live guard, Journal | Needs an active plan | Subscribe |
| `pg` | Live guard, Journal | Needs an active plan | Pay ₹1,299 |

Every other page stays usable in every case. Trades and Tax are your own record.

---

## 6. Toasts (once per entry into a case)

| Moving into | Toast |
|---|---|
| any protected case, from `pf` `te` `pe` `pg` `lf` | Payment went through. Your guard is back on. |
| `t1` | Guard on. {account} is protected. |
| `tc` | Trial cancelled. You won't be charged. |
| `pc` | Pro cancelled. You're protected until {date}. |
| `p` | Payment received · ₹1,299. Invoice in Plan & billing. |
| `pf` | Payment failed. Your guard is off until it goes through. |
| any other flip into or out of protection | Your guard is on. / Your guard is off. |

- **Not shown on Plan & billing,** where the button already said it.
- **"Once" is remembered in the browser for now.** It moves to the server later (see §9).

---

## 7. Smaller surfaces

| Where | When | Says |
|---|---|---|
| Kill switch button (tooltip) | plan off | Works without a plan: your rules are off, your kill switch is not |
| Kill switch button (disabled, tap toast) | `s0` `s2` / `s3` | Works once your key is connected / Starts with your free trial |
| Kill switch sheet | plan off | Your rules aren't active right now. This kill switch is. |
| Rules page, under the title | plan off | Rules are saved but not enforced while your plan is inactive. (toggles disabled) |
| Sidebar plan line | each case | e.g. Trial · 5 days left · Pro · Pro · payment failed · No plan · trial ended · Setup · step 3 of 4 |
| Sidebar badges | plan off / setup | LOCKED on locked pages · red "!" on Plan & billing (plan off) or Connect key (`s2`) · Rules shows SAVED or DRAFT |
| Accounts, each label | plan off | Not protected · rules saved (`pf`: Not protected · payment failed) |
| Accounts, each label | `tc` `pc` | …· until {date} |
| Setup, after a key connects | plan off | Account connected. Your guard is off until your plan is active. |
| Activity / All trades / Trade detail | a rule hit with no plan | {Rule} reached · not enforced (no active plan), shown with an amber "not enforced" tag |
| Push (engine) | a rule hit with no plan, at most once per rule per day | {Rule} reached · not enforced. Your plan isn't active. (`s3`, never had a plan: …Start your free trial to switch your guard on.) |
| Rules page | every case | All rules in one list. No plan tiers, no Upgrade chips: setup drafts, protected edits, plan off is view only (server refuses saves too). |

---

## 8. Plan & billing

The page state follows the case: `setup` · `trial` · `confirming` · `active` · `failed` · `cancelled` · `ended` (from trial, pro or unpaid) · `comp` · `unknown`. The chips, body lines, buttons and bottom rows are in `billingCopy.js`.

A paying user who has no accounts still sees their subscription, not the setup step.

---

## 9. Not built yet (needs server work)

- **Switching pill:** "Switching your guard on/off…", plus "Taking longer than usual. Your settings are saved." after 90 seconds. Needs the engine's `guard_applied_at`.
- **Open-positions switch-off toast:** "Your guard is off. Open positions are not being watched."
- **Lifecycle emails and pushes:** the per-case schedule in the spec.
- **Server-side "toast seen":** so a toast doesn't repeat on another device.
- **Missing payment details:** card brand and last 4, Dodo's retry dates, and the real amount due when a coupon applies.
