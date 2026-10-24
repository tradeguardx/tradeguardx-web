/* eslint-disable react-refresh/only-export-components --
   An article module exports its toc and faq next to the copy they describe, so
   the FAQ schema can never drift from the visible text. */
import { Link } from 'react-router-dom';
import { H2, P, UL, LI, B, Callout, KeyTakeaways, Table } from '../../../components/blog/Prose';
import FairWallet from '../../../components/blog/visuals/FairWallet';
import BadMomentTest from '../../../components/blog/visuals/BadMomentTest';
import ToolFinder from '../../../components/blog/visuals/ToolFinder';
import { MOMENTS, TOOLS } from '../../../components/blog/visuals/badMoments';

/*
 * Query: "best crypto risk management tool India" and its neighbours ("crypto
 * trading discipline app", "crypto kill switch alternative"). Commercial
 * intent, so the reader is choosing. The competitor page for the F&O version
 * ranks everything and wins every row; this one tests each option against four
 * real moments and tells some readers not to buy.
 *
 * VOICE: written for someone who has never read a trading blog. Short
 * sentences. No "in today's fast-paced", no "delve", no "navigate", no
 * "game-changer", and almost no em-dashes. If a sentence would sound strange
 * said out loud to a friend, it's rewritten.
 *
 * FACTS: third-party claims come from public docs as of Oct 2026 — Delta's own
 * blog on Tradetron, iOS/Android screen-time features, Kotak Neo's published
 * kill-switch terms. TradeGuardX claims checked against the risk engine. Price
 * is not quoted because it is served live from the API; link /pricing.
 */

export const toc = [
  { id: 'short-version', label: 'The short version' },
  { id: 'the-fair', label: 'The fair (start here)' },
  { id: 'tools', label: 'Every tool, one by one' },
  { id: 'four-moments', label: 'The four-moment test' },
  { id: 'side-by-side', label: 'Side by side' },
  { id: 'which-one', label: 'Which one do you need?' },
  { id: 'cant-do', label: 'What TradeGuardX can’t do' },
  { id: 'how-we-checked', label: 'How we checked' },
];

export const faq = [
  {
    q: 'What is the best risk management tool for crypto trading in India?',
    a: 'There isn’t one tool that does everything. Use the free tools your exchange gives you (a stop-loss on every trade and isolated margin) for each position. If you trade futures most days, add something that stops the whole day when it goes badly. For Delta Exchange, CoinDCX and Shark Exchange, TradeGuardX does that. We make it, so check the comparison above rather than taking our word for it.',
  },
  {
    q: 'Does Delta Exchange have a daily loss limit?',
    a: 'We couldn’t find an account-wide daily loss limit in Delta Exchange’s public documentation when we checked in October 2026. Delta does offer stop-loss, take-profit and bracket orders, which protect one position at a time. If Delta adds a daily limit of its own, use it.',
  },
  {
    q: 'Is TradeGuardX the same as TradeGuard?',
    a: 'No. They are different companies. TradeGuard (tradeguardhq.in) is built for Indian stock F&O traders and connects to brokers like Dhan, Zerodha and Upstox. TradeGuardX is built for crypto futures and connects to Delta Exchange, CoinDCX and Shark Exchange.',
  },
  {
    q: 'Can I use an algo platform like Tradetron and TradeGuardX together?',
    a: 'Yes. TradeGuardX watches your whole exchange account, not one app, so trades placed by a bot count toward your limits just like trades you place by hand. If a rule locks the account, that applies to the bot’s trades too.',
  },
  {
    q: 'Are free tools enough to manage risk in crypto futures?',
    a: 'For a lot of people, yes. If you trade a few times a month and have never broken your own loss rule, a stop-loss on every trade plus isolated margin is a solid setup. Free tools fall short in one place: none of them stop you from taking the next trade after a bad run.',
  },
  {
    q: 'Do I need a kill switch for spot crypto trading?',
    a: 'Usually not. Without leverage, one bad hour can’t wipe out your account the way it can on futures. TradeGuardX only covers futures for this reason.',
  },
];

function ToolCard({ name, tag, good, stops, cost, us = false }) {
  return (
    <div
      className="mb-4 rounded-2xl border px-5 py-5"
      style={{ borderColor: us ? 'rgba(0,212,170,.3)' : 'rgba(255,255,255,.07)', background: us ? 'rgba(0,212,170,.04)' : 'rgba(255,255,255,.02)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[19px] font-bold text-white">{name}</h3>
        <span className="text-[12px] font-semibold text-slate-500">{cost}</span>
      </div>
      <p className="mt-1 text-[14px] italic text-slate-400">{tag}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Good at</p>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-300">{good}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Where it stops</p>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-300">{stops}</p>
        </div>
      </div>
    </div>
  );
}

const LABEL = { yes: '✓ Steps in', some: '~ Partly', no: '✕' };

export default function BestCryptoRiskManagementToolsIndia() {
  return (
    <>
      <P>
        We make one of the tools on this list. So we’ll say it now: for some of you, the right answer is a free tool you
        already have, and we’ll tell you who you are.
      </P>
      <P>
        Most “best tools” pages give everything stars and put their own product on top. We didn’t want to do that. So
        instead of stars, we took four moments where crypto traders actually lose money, and checked what each tool does
        when that moment arrives. Does it step in, or not?
      </P>

      <H2 id="short-version">The short version</H2>
      <KeyTakeaways
        items={[
          'Use your exchange’s free tools on every trade: a stop-loss and isolated margin. They’re good, and they cost nothing.',
          'Those tools protect one trade. None of them stop you from taking the next trade after a bad run. That’s where most accounts get hurt.',
          'Phone screen-time limits and journals help a bit, but you can switch one off in a second, and the other only works after the damage.',
          'For a daily loss limit that actually holds on Delta Exchange, CoinDCX or Shark Exchange, TradeGuardX is the only tool we know of that does it. We make it.',
          'If you only trade spot, or trade a few times a month, you probably don’t need a kill switch at all.',
        ]}
      />

      <H2 id="the-fair">Start here: the fair and the pocket money</H2>
      <P>
        Forget trading for one minute. You’re ten years old, it’s a fair, and you have ₹500 of pocket money. Every game
        costs ₹50. You promised yourself you’d stop after spending ₹150.
      </P>
      <P>Try the three versions of the day:</P>

      <FairWallet />

      <P>
        The first two days end the same way. That surprises people. A cap on each game didn’t help, because the problem
        was never one game. And the sign didn’t help, because the person reading it was the same person who wanted to
        keep playing.
      </P>
      <P>
        Only the third day is different, and it’s different for one reason. <B>Someone other than you made the call.</B>{' '}
        Keep that in your head for the rest of this page. Every tool below is one of those three: a cap per game, a sign,
        or a parent.
      </P>

      <H2 id="tools">Every tool, one by one</H2>
      <P>
        These are the things Indian crypto traders actually use to control risk. We’ve put them roughly in the order
        most people find them.
      </P>

      <ToolCard
        name="Stop-loss orders"
        tag="The ₹50 cap per game."
        cost="Free, on most exchanges"
        good="Closing one trade automatically when price hits your level. Delta Exchange and CoinDCX both let you set a stop and a take-profit, and so do most futures exchanges. Use one on every single trade."
        stops="It only knows about its own trade. It can’t see that you’ve already lost three times today, and it won’t stop you opening the fourth."
      />
      <ToolCard
        name="Isolated margin"
        tag="Putting just one game’s money in your pocket at a time."
        cost="Free, on most exchanges"
        good="Making sure one bad position can only lose the margin you gave it, and can’t eat the rest of your account."
        stops="You decide how much margin goes in. On a bad day, people put in more. It limits the damage per trade, not per day."
      />
      <ToolCard
        name="Phone screen-time limits"
        tag="A sign on the door that says “closed”, which you can take down."
        cost="Free, built into iPhone and Android"
        good="Blocking the exchange app after a set time or during set hours. iPhone calls it Screen Time; Android calls it Digital Wellbeing. Genuinely helpful for late-night trading."
        stops="One tap on “ignore limit” and you’re back in. It also doesn’t cover the exchange website on your laptop, and it can’t close a trade that’s already open."
      />
      <ToolCard
        name="Algo platforms (like Tradetron)"
        tag="A robot that plays the games for you, by your rules."
        cost="Paid plans for live trading"
        good="Running a strategy automatically. Delta Exchange officially supports Tradetron, so you can connect with API keys and let it place trades. You can build exits into the strategy."
        stops="It manages the strategy’s own trades. It isn’t built to watch and stop the trades you place yourself in the exchange app, and that’s usually where the trouble starts."
      />
      <ToolCard
        name="Trading journal"
        tag="Writing in your diary about the fair, that night."
        cost="Free (a spreadsheet) to paid apps"
        good="Showing you your patterns. After a month you’ll see when you lose, how big, and what you were feeling. Every serious trader should keep one."
        stops="It only ever looks backwards. It can’t do anything while the bad day is happening."
      />
      <ToolCard
        name="Your stock broker’s kill switch"
        tag="A parent, but at a different fair."
        cost="Free with some brokers"
        good="Some Indian stock brokers have one. Kotak Neo’s, for example, blocks trading in a segment for the rest of the day once you turn it on. Tools like TradeGuard (tradeguardhq.in) add automatic rules on top for Dhan, Zerodha and Upstox."
        stops="These are for stock F&O. None of them connect to crypto exchanges, so they don’t help with your Delta or CoinDCX account."
      />
      <ToolCard
        us
        name="TradeGuardX"
        tag="The parent who takes you home."
        cost="Paid, with a 3-day free trial"
        good="Watching your whole crypto futures account from our servers, all the time. You set a daily loss limit, a max number of trades, a loss-streak pause and a few more rules. When one is hit, it cancels your orders, closes your positions and locks the account until your reset time. It works whether you trade from the website, the phone app or a bot."
        stops="It can’t stop an order from reaching the exchange. It closes it right after. It’s futures only, and only on Delta Exchange, CoinDCX and Shark Exchange. And it costs money, which the tools above don’t."
      />

      <H2 id="four-moments">The four-moment test</H2>
      <P>
        Here’s the part we care about most. Pick a moment. Each one is something that happens to real traders all the
        time, and you’ll probably recognise at least one.
      </P>

      <BadMomentTest />

      <P>
        Notice our own row isn’t all green. At 1 am, if you haven’t locked your account, TradeGuardX lets the trade
        through. It enforces rules; it doesn’t read minds. That’s why there’s a self-lock you can arm before bed for
        three, six or twelve hours. Once it’s on, there’s no cancel button.
      </P>

      <H2 id="side-by-side">Side by side</H2>
      <P>The same results in one table, so you can compare at a glance:</P>
      <Table
        caption="Which risk tools step in at four bad trading moments"
        head={['Tool', ...MOMENTS.map((m) => m.short)]}
        rows={TOOLS.map((t) => [t.name, ...MOMENTS.map((m) => LABEL[m.cells[t.id].v])])}
      />
      <P>
        Read the table this way: the free tools are a column of ✕ on the bad-day moments, and that’s fine. They were
        never meant for those moments. They’re meant for the trade itself, and they’re great at it. You want both layers.
      </P>

      <H2 id="which-one">Which one do you actually need?</H2>
      <P>Three questions. Be honest with the third one.</P>

      <ToolFinder />

      <H2 id="cant-do">What TradeGuardX can’t do</H2>
      <P>
        If you’re thinking about trying it, you should know the limits first. It’s better to hear them from us now than
        to find them out later.
      </P>
      <UL>
        <LI>
          <B>It can’t stop an order before it reaches the exchange.</B> No exchange lets anyone do that. What it does is
          close the position as soon as it appears, then check that you really are flat.
        </LI>
        <LI>
          <B>A forced close can cost a little.</B> Closing at market means paying the fee and taking whatever price is
          there. On a fast day that can be a bit past your limit.
        </LI>
        <LI>
          <B>Futures only, three exchanges.</B> Delta Exchange, CoinDCX and Shark Exchange. No spot, no Binance, no
          WazirX.
        </LI>
        <LI>
          <B>It’s a seatbelt you choose to wear.</B> You own your exchange account and you can always delete the API key.
          It’s built for people who want to be protected from their worst hour, not to stop someone determined to get
          around it.
        </LI>
        <LI>
          <B>It can’t touch your money.</B> The key it uses can trade and read, but it can’t withdraw. Your funds stay
          in your own exchange wallet. More on that on our{' '}
          <Link to="/security" className="text-accent hover:underline">security page</Link>.
        </LI>
      </UL>

      <Callout tone="tip" title="If you want to try it">
        Connect a trade-only API key, set your daily loss limit, and you’re covered from that minute. The first 3 days are
        free. See <Link to="/pricing" className="text-accent hover:underline">pricing</Link>, or start with{' '}
        <Link to="/blog/daily-loss-limit-crypto-futures" className="text-accent hover:underline">
          how to pick your daily loss limit
        </Link>{' '}
        so you know what number to type in.
      </Callout>

      <H2 id="how-we-checked">How we checked</H2>
      <P>
        We didn’t score tools out of ten. A score hides the one thing that matters: what happens at the bad moment. So
        we picked four moments and asked what each tool is built to do when that moment comes.
      </P>
      <P>
        Everything we say about other tools comes from their own public pages, as of October 2026. Things change. If
        something here is out of date, tell us at{' '}
        <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">support@tradeguardx.com</a>{' '}
        and we’ll fix it.
      </P>
      <P>
        And one last time, because it matters: we make TradeGuardX. We’ve tried to write the page we’d want to read if
        we didn’t. Judge it on that.
      </P>
    </>
  );
}
