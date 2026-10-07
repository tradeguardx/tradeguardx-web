/**
 * Put a user into any subscription state, for walking the UI by hand.
 *
 *   node scripts/trialState.mjs you@example.com trial
 *
 * States: none · trial · cancelled · abandoned · active · expired · nocard · show
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WRITES TO THE SHARED DATABASE. It takes an EMAIL and refuses to run without
 * one, so you cannot fat-finger it into touching every row — which is exactly
 * the kind of script that does. It prints the before and after of the one row
 * it changes, and nothing else.
 *
 * Use it on your own test account. The states it writes are the real shapes
 * the webhook produces, not approximations, so the UI you see is the UI a
 * real user in that state would see.
 * ──────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

/* `pg` is borrowed from a backend service rather than added here. The web app
   has no business depending on a Postgres driver, and a dev-only script is not
   a reason to put one in its lockfile. */
const pg = createRequire(import.meta.url)(
  path.join(ROOT, 'tradeguardx-trade-service/node_modules/pg'),
);
const url = fs
  .readFileSync(path.join(ROOT, 'tradeguardx-trade-service/.env'), 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim();

const [email, state] = process.argv.slice(2);
const DAY = 86_400_000;
const at = (d) => new Date(Date.now() + d * DAY);

/** Each entry is exactly what the Dodo webhook would have written. */
const STATES = {
  /** Signed up, no mandate. Expect: "Your guard is off" banner, dashboard usable. */
  none: { plan: 'free', source: 'free', status: 'incomplete', periodEnd: null, trialEnd: null },
  /** Mandate attached, inside the window. Expect: "₹1,299 on <date>, cancel before". */
  trial: { plan: 'pro', source: 'payment', status: 'trialing', periodEnd: at(7), trialEnd: at(7) },
  /** Cancelled mid-trial. Expect: "Cancelled. Access until <date>. You won't be charged." */
  cancelled: { plan: 'pro', source: 'payment', status: 'canceled', periodEnd: at(4), trialEnd: at(4) },
  /** Checkout opened, never finished. Expect: same as `none` — NOT "trial ended". */
  abandoned: { plan: 'pro', source: 'payment', status: 'incomplete', periodEnd: null, trialEnd: null },
  /** Paying. Expect: no trial banner, "next charge" on billing. */
  active: { plan: 'pro', source: 'payment', status: 'active', periodEnd: at(30), trialEnd: null },
  /** Trial ran out, nothing paid. Expect: upgrade wall. */
  expired: { plan: 'pro', source: 'payment', status: 'canceled', periodEnd: at(-3), trialEnd: at(-3) },
  /** Legacy no-card trial — an existing user mid-trial. Expect: "you keep the days you have left". */
  nocard: { plan: 'free', source: 'free', status: 'trialing', periodEnd: at(3), trialEnd: null },
};

if (!email || (!STATES[state] && state !== 'show')) {
  console.error(`usage: node scripts/trialState.mjs <email> <${Object.keys(STATES).join('|')}|show>`);
  process.exit(1);
}

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows: users } = await c.query('select id from auth.users where lower(email) = lower($1)', [email]);
if (!users[0]) {
  console.error(`no user with email ${email}`);
  await c.end();
  process.exit(1);
}
const userId = users[0].id;

const read = async () => {
  const { rows } = await c.query(
    `select p.slug as plan, s.source, s.status, s.current_period_end, s.trial_ends_at
       from subscriptions s join plans p on p.id = s.plan_id where s.user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
};

console.log('before:', await read());

if (state !== 'show') {
  const want = STATES[state];
  const { rows: plans } = await c.query('select id from plans where slug = $1', [want.plan]);
  if (!plans[0]) throw new Error(`no plan with slug ${want.plan}`);
  await c.query(
    `insert into subscriptions (user_id, plan_id, source, status, current_period_end, trial_ends_at, updated_at)
     values ($1,$2,$3,$4,$5,$6, now())
     on conflict (user_id) do update set
       plan_id = excluded.plan_id, source = excluded.source, status = excluded.status,
       current_period_end = excluded.current_period_end, trial_ends_at = excluded.trial_ends_at,
       updated_at = now()`,
    [userId, plans[0].id, want.source, want.status, want.periodEnd, want.trialEnd],
  );
  console.log('after: ', await read());
  console.log(`\n→ reload the dashboard. Hard-refresh if the banner looks stale.`);
}

await c.end();
