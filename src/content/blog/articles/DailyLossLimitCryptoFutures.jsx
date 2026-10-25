/* eslint-disable react-refresh/only-export-components --
   An article module exports its toc and faq next to the copy they describe, so
   the FAQ schema can never drift from the visible text. Hot reload on a content
   file is not worth splitting that. */
import { Link } from 'react-router-dom';
import { H2, H3, P, UL, LI, B, Step, Callout, KeyTakeaways, Table } from '../../../components/blog/Prose';
import DayLimitHero from '../../../components/blog/visuals/DayLimitHero';
import ScopeLadder from '../../../components/blog/visuals/ScopeLadder';
import RecoveryBars from '../../../components/blog/visuals/RecoveryBars';
import LeverageMeter from '../../../components/blog/visuals/LeverageMeter';
import LossLimitCalculator from '../../../components/blog/visuals/LossLimitCalculator';
import RevengeSpiral from '../../../components/blog/visuals/RevengeSpiral';

/*
 * Query: "daily loss limit" for crypto futures, Indian trader. The searcher
 * wants a NUMBER and a way to defend it; the F&O pages that rank for this give
 * the 2–3R rule and stop. What they leave out is everything crypto changes:
 * no closing bell, so "a day" has to be defined; leverage, so fees alone can
 * eat the limit; and an app on the phone at 1am.
 *
 * Every TradeGuardX claim below was checked against the risk engine
 * (src/rules/dailyLoss.ts): % or ₹ limit, realised-since-reset + unrealised,
 * deposit-immune, warning level notifies only, lock until the account's own
 * reset hour. Do not add the 24-hour loosening delay — it is not live.
 */

export const toc = [
  { id: 'what-it-is', label: 'What a daily loss limit is' },
  { id: 'why-crypto', label: 'Why crypto needs one more' },
  { id: 'calculate', label: 'Calculate yours in 4 steps' },
  { id: 'worked-example', label: 'Worked example in rupees' },
  { id: 'crypto-settings', label: 'Crypto-only settings' },
  { id: 'enforcement', label: 'Why self-enforcement fails' },
  { id: 'mistakes', label: 'Six mistakes' },
  { id: 'when-it-fires', label: 'When it fires' },
];

export const faq = [
  {
    q: 'What is a good daily loss limit for crypto futures?',
    a: 'For most traders, 2 to 3 times the amount you risk on a single trade. If you risk 1% of your trading capital per trade, that puts the daily limit at 2–3% of capital. On a ₹1,00,000 account that is ₹2,000 to ₹3,000 a day. Beginners and anyone trading above 20× leverage should sit at the lower end.',
  },
  {
    q: 'Should my daily loss limit be a percentage or a fixed rupee amount?',
    a: 'Decide it as a percentage, then fix it in rupees for the day. A percentage scales as the account grows or shrinks; a rupee figure is what you can actually see on screen in the middle of a losing trade. What you must avoid is a percentage of a balance that changes during the day — a deposit would raise your limit at exactly the wrong moment.',
  },
  {
    q: 'When does a day start in crypto, which trades 24/7?',
    a: 'Whenever you decide, and you must decide. Most exchanges roll their daily candles at 00:00 UTC, which is 5:30 am IST. Pick a reset hour when you are normally asleep or not trading, so a single session never straddles two days and gets two limits.',
  },
  {
    q: 'Should open (unrealised) losses count toward the daily limit?',
    a: 'Yes. A limit that only counts booked losses can be dodged by not closing the losing trade, which is the exact behaviour it is meant to stop. Count realised and unrealised P&L together.',
  },
  {
    q: 'Is a daily loss limit the same as a stop loss?',
    a: 'No. A stop loss caps one trade. A daily loss limit caps the whole session, however many trades you take. Most accounts are not blown by one trade without a stop; they are blown by six trades in an hour, each with a stop, each one bigger than the last.',
  },
  {
    q: 'Can I set a daily loss limit directly on Delta Exchange or CoinDCX?',
    a: 'Exchanges give you per-position tools — stop losses, take-profits, isolated margin — but not a rule that stops all trading once the day is down a set amount. That needs a tool that watches the whole account. TradeGuardX does this server-side for Delta Exchange, CoinDCX futures and Shark Exchange.',
  },
];

export default function DailyLossLimitCryptoFutures() {
  return (
    <>
      <DayLimitHero />

      <P>
        Every trader who has blown a futures account remembers the trade that did it. Almost none of them remember it
        correctly. It was rarely one trade. It was the third or fourth trade of a morning that had already gone wrong —
        each entered faster, each a little bigger, each meant to undo the one before.
      </P>
      <P>
        A daily loss limit is the rule that ends that morning early. This guide shows you how to calculate one for
        crypto futures in rupees, the settings that matter in a market that never closes, and the uncomfortable part
        most guides skip: a limit that only lives in your head tends to fail on the one day you need it.
      </P>

      <KeyTakeaways
        items={[
          'A daily loss limit is the most you will let yourself lose in one trading day, decided before the day starts.',
          'Set it at 2–3× your risk per trade. Risking 1% a trade gives a limit of 2–3% of trading capital.',
          'Crypto never closes, so pick a reset hour yourself. 5:30 am IST (00:00 UTC) works for most people.',
          'Count open losses as well as booked ones, and fix the number in rupees for the day.',
          'It only works if something other than you enforces it when it is hit.',
        ]}
      />

      <H2 id="what-it-is">What a daily loss limit is, and what it isn’t</H2>
      <P>
        A daily loss limit is a ceiling on how much money you can lose in one trading day. When your losses for the day
        reach it, you stop. No new trades, no “one more to get back to flat”, no switching to a different coin. The day
        is over and the next one starts at your reset time.
      </P>
      <P>
        It gets confused with three other limits, and the confusion is expensive, because each one protects a
        different span of time:
      </P>

      <ScopeLadder />

      <P>
        The one people lean on most is the one that protects them least. <B>A liquidation price is not a stop.</B> It
        is the point at which the exchange closes your position to protect itself, after your margin is already gone,
        and at whatever price the market gives it. If liquidation is your risk plan, you don’t have one.
      </P>

      <H2 id="why-crypto">Why crypto futures need one more than anything else</H2>
      <P>
        Equity F&amp;O traders in India get a free daily loss limit they rarely think about: the market shuts at 3:30
        pm. However badly the day goes, the bell ends it. Crypto has no bell. Three things make that worse.
      </P>
      <H3>1. Leverage turns small moves into large losses</H3>
      <P>
        On an equity account a 1% move is a 1% move. On a 25× futures position it is 25% of the margin behind it. The
        maths is simple and still catches people out, so drag the slider:
      </P>

      <LeverageMeter />

      <P>
        Look at the fee figure as well as the loss. Exchanges charge fees on the full position size, not on your
        margin, and GST is added on top. At high leverage a trader who takes ten trades a day can spend a real share
        of their daily limit on fees before the price has moved at all. That is where{' '}
        <Link to="/help/rules" className="text-accent hover:underline">
          a cap on trades per day
        </Link>{' '}
        earns its place next to the loss limit.
      </P>

      <H3>2. Losses and recoveries are not symmetric</H3>
      <P>
        Lose 10% and you need 11% to get back. Lose 50% and you need 100%. Every extra rupee lost in a bad session makes
        the climb back steeper, and that is the strongest argument for stopping early rather than late:
      </P>

      <RecoveryBars />

      <H3>3. The exchange is always in your pocket</H3>
      <P>
        Closing the laptop used to be a decision. Now the same account is on your phone, at a family dinner, at 1 am
        when Bitcoin wakes up. A limit that depends on you not opening the app is a limit that depends on willpower at
        the worst possible time.
      </P>

      <H2 id="calculate">How to calculate your daily loss limit in four steps</H2>
      <P>
        The method works backwards from the one number you should already have: how much you risk on a single trade.
        If you don’t have that number yet, step two gives you one.
      </P>

      <Step n="1" title="Write down your trading capital">
        <p>
          This is the money sitting in your exchange futures wallet for trading. It is not your savings, and not money
          you plan to “top up if needed”. If topping up is part of the plan, the plan is already broken.
        </p>
      </Step>
      <Step n="2" title="Pick your risk per trade (1R)">
        <p>
          1R is the most you lose on one trade if your stop is hit. Most professional guidance sits at 0.5% to 1% of
          capital; 2% is the outer edge. On ₹1,00,000, 1% is ₹1,000.
        </p>
        <p>
          Your stop distance and leverage then decide your position size, not the other way round. Choosing 50× first
          and working out the risk afterwards is how 1R quietly becomes 4R.
        </p>
      </Step>
      <Step n="3" title="Set the daily limit at 2 to 3R">
        <p>
          Losing streaks are normal, even for a good strategy. With a 50% win rate, the first three trades of a day all
          lose about one session in eight (0.5 × 0.5 × 0.5). A limit of 2–3R lets a normal losing streak play out, and
          stops you at the point where the fourth and fifth trades usually start doing the damage.
        </p>
        <p>
          On ₹1,00,000 at 1R = ₹1,000, that gives a daily limit of ₹2,000 to ₹3,000, or 2–3% of capital.
        </p>
      </Step>
      <Step n="4" title="Check the runway">
        <p>
          Ask how many days in a row you could hit the limit before the account is down 20%. At 2% a day it takes 11;
          at 5% a day, only 4. If you can’t picture surviving a bad fortnight at your number, the number is too big.
        </p>
        <p>
          For reference, prop-firm challenges commonly cap a single day at around 4–5% of the account. They also cap
          the account as a whole, and you lose their money, not yours.
        </p>
      </Step>

      <P>Or run your own numbers:</P>

      <LossLimitCalculator />

      <H2 id="worked-example">A worked example in rupees</H2>
      <P>Three common account sizes, all at 1% risk per trade and a 2.5R daily limit:</P>
      <Table
        caption="Daily loss limits at 1% risk per trade and 2.5R per day"
        head={['', '₹25,000 account', '₹1,00,000 account', '₹5,00,000 account']}
        rows={[
          ['Risk per trade (1R)', '₹250', '₹1,000', '₹5,000'],
          ['Daily loss limit (2.5R)', '₹625', '₹2,500', '₹12,500'],
          ['Early warning (60%)', '₹375', '₹1,500', '₹7,500'],
          ['Max-loss days to −20%', '8', '8', '8'],
        ]}
      />
      <P>
        The runway is the same in every column, because it depends on the percentage and not on the account size. The
        rupee figures are what change, and they are the ones you will actually see when a trade is going against you.
      </P>
      <Callout tone="warn" title="The small-account trap">
        On a ₹25,000 account, a ₹2,50,000 position (10× on the full balance) costs about ₹295 for one round trip at a
        0.05% taker fee plus 18% GST. That is more than the account’s entire 1R of ₹250. Small accounts at high leverage
        can lose a full trade’s risk to fees alone. Check your exchange’s fee schedule; the rate in this example is an
        illustration, not a quote.
      </Callout>

      <H2 id="crypto-settings">Four settings F&amp;O guides don’t mention</H2>
      <H3>Choose your reset hour</H3>
      <P>
        Crypto doesn’t close, so “today” is whatever you define it as. Most exchanges roll their daily candles at 00:00
        UTC, which is 5:30 am IST. Pick a reset time when you are normally asleep. A midnight reset is a trap for night
        traders: lose your limit at 11:50 pm and a brand new limit arrives ten minutes later, in the middle of the same
        tilted session.
      </P>
      <H3>Count open losses, not just booked ones</H3>
      <P>
        If only closed trades count, the limit can be dodged by not closing the loser — and holding a losing trade in
        the hope that it comes back is exactly the behaviour you’re trying to stop. Measure realised and unrealised
        P&amp;L together.
      </P>
      <H3>Fix it in rupees, and keep deposits out of it</H3>
      <P>
        Decide the limit as a percentage, then treat it as a rupee figure for the day. If the limit is a percentage of
        your live balance, depositing ₹20,000 after a bad morning quietly raises it. Deposits and withdrawals aren’t
        trading results and shouldn’t move the line.
      </P>
      <H3>Add an early warning</H3>
      <P>
        A warning at around 60% of the limit is the cheapest discipline tool there is. It turns “I’m down ₹2,500, locked
        out” into “I’m down ₹1,500, one more bad trade ends my day” — a moment where you can still choose to stop.
      </P>

      <H2 id="enforcement">Why a limit you enforce yourself fails</H2>
      <P>
        Here is a morning like that one, trade by trade. Run it both ways:
      </P>

      <RevengeSpiral />

      <P>
        Nobody sits down planning trades four to six. They happen because the person deciding at 10:31 is not the
        person who set the limit at 9 am. The 9 am trader was calm. The 10:31 trader is down ₹3,900 and sure the next
        one comes back. A rule that asks the 10:31 trader to enforce it is asking the wrong person.
      </P>
      <P>So it comes down to what does the enforcing. In rough order of how well each one holds up:</P>
      <UL>
        <LI>
          <B>A written rule.</B> Better than nothing, and the first thing to go when you are tilted.
        </LI>
        <LI>
          <B>Exchange tools: stops, take-profits, isolated margin.</B> Essential, but they work one position at a time.
          None of them stops the next trade.
        </LI>
        <LI>
          <B>Moving money out of the exchange.</B> It works, but it is clumsy, slow to undo, and easy to talk yourself
          out of.
        </LI>
        <LI>
          <B>An automated kill switch.</B> Software that watches the whole account and acts when the day’s loss hits
          the line, whether or not you’re looking.
        </LI>
      </UL>

      <Callout tone="tip" title="How TradeGuardX enforces it">
        You set the limit as a percentage or a rupee amount, with an optional warning level. The engine measures your
        trading P&amp;L since your daily reset, open positions included, so deposits and withdrawals don’t move it.
        When the limit is hit it cancels your open orders, market-closes every position, checks that you really are
        flat, and locks the account until your next reset, in your own timezone and reset hour. It runs on our servers,
        so it works whether you trade from the website, the phone app or a bot. It works on{' '}
        <Link to="/exchanges/delta" className="text-accent hover:underline">Delta Exchange</Link>,{' '}
        <Link to="/exchanges/coindcx" className="text-accent hover:underline">CoinDCX</Link> and{' '}
        <Link to="/exchanges/shark" className="text-accent hover:underline">Shark Exchange</Link>.
        <span className="mt-2 block text-slate-400">
          What it can’t do: stop an order reaching the exchange. No exchange gives a third party that power. Anything
          you open during a lock is closed as soon as it appears.
        </span>
      </Callout>

      <H2 id="mistakes">Six mistakes that make a daily limit useless</H2>
      <UL>
        <LI>
          <B>Setting it so wide it never fires.</B> At 10% a day, two bad days take nearly a fifth of the account. A limit
          that only triggers on a disaster isn’t protecting you from anything.
        </LI>
        <LI>
          <B>Setting it so tight it fires on fees.</B> If ordinary spread and fees can trip it, you will start ignoring
          it, and a limit you ignore is worse than none.
        </LI>
        <LI>
          <B>Raising it “just for today”.</B> The only time you want to raise the limit is when you are losing. That is
          also the only time you should never be allowed to.
        </LI>
        <LI>
          <B>Topping up to keep trading.</B> A deposit after a loss is the account’s version of doubling your size.
        </LI>
        <LI>
          <B>Doubling size the next day to win it back.</B> The limit resets. Your risk per trade shouldn’t change.
        </LI>
        <LI>
          <B>Having no matching profit rule.</B> Big green mornings turn red in the afternoon too. A{' '}
          <Link to="/help/rules" className="text-accent hover:underline">daily profit target</Link> that ends the day
          once you’ve booked it, and are flat, protects the good days the way the loss limit protects the bad ones.
        </LI>
      </UL>

      <H2 id="when-it-fires">What to do when it fires</H2>
      <P>
        The limit firing is not a failure. It is the system doing the one job you gave it. What you do next decides
        whether it was worth having.
      </P>
      <UL>
        <LI>
          <B>Close the app.</B> Not to check the chart. You’ll see the move you would have caught, and that feeling is
          the one that sends traders hunting for a way around their own rules.
        </LI>
        <LI>
          <B>Write three lines.</B> What was the first trade, when did the plan stop, and what were you feeling at the
          third entry? Over a month, those notes show your pattern better than any indicator.
        </LI>
        <LI>
          <B>Trade the same size tomorrow.</B> Not bigger to recover. Same R, same limit.
        </LI>
        <LI>
          <B>If it fires three days in one week, halve your risk per trade.</B> Something about the strategy or the
          market has changed, and smaller size buys time to find out what.
        </LI>
      </UL>
      <P>
        And if you can feel a bad session building before any rule has fired, you don’t have to wait for it. TradeGuardX
        has a lock you can trigger yourself for three, six or twelve hours. It has no cancel button — the clock is the
        only thing that lifts it. More on how that works in{' '}
        <Link to="/crypto-kill-switch" className="text-accent hover:underline">
          what a crypto kill switch is
        </Link>
        .
      </P>
    </>
  );
}
