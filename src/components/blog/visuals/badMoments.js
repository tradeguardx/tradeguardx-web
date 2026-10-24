/*
 * The tools and the four moments, as data. Shared by the interactive test and
 * the article's side-by-side table.
 *
 * Every TradeGuardX verdict was checked against the risk engine and the rule
 * list in src/lib/venueSeo.js (ENFORCED_RULES). Note the 'some' verdicts on
 * our own row: an unlocked account lets a 1 am trade through, and Risk Per
 * Trade only works when the position has a stop to measure. Saying so is the
 * difference between a comparison and an advert.
 */

export const TOOLS = [
  { id: 'sl', name: 'Stop-loss orders', cost: 'Free, on most exchanges' },
  { id: 'iso', name: 'Isolated margin', cost: 'Free, on most exchanges' },
  { id: 'screen', name: 'Phone screen-time limit', cost: 'Free, built into iPhone and Android' },
  { id: 'algo', name: 'Algo platform (e.g. Tradetron)', cost: 'Paid plans for live trading' },
  { id: 'journal', name: 'Trading journal', cost: 'Free (spreadsheet) to paid' },
  { id: 'tgx', name: 'TradeGuardX', cost: 'Paid, 3-day free trial', us: true },
];

export const MOMENTS = [
  {
    id: 'revenge',
    short: 'Revenge trade',
    emoji: '😤',
    title: 'Three losses in a row. You want it back.',
    story: 'It’s 10:20. Three trades, three losses. You’re sure the next one works, and you’re about to take it bigger.',
    cells: {
      sl: { v: 'no', why: 'Puts a cap on the next trade. Doesn’t stop you taking it, or the ten after it.' },
      iso: { v: 'no', why: 'Limits what one position can lose. Has no idea you’ve already lost three times today.' },
      screen: { v: 'some', why: 'Can block the app after a set time. One tap on “ignore limit” and you’re back in.' },
      algo: { v: 'no', why: 'Runs the strategy you built. It isn’t watching the trades you place yourself.' },
      journal: { v: 'no', why: 'You’ll write about this tonight. It can’t stop it now.' },
      tgx: { v: 'yes', why: 'The loss-streak rule pauses trading after your chosen number of losses (3 by default), and the daily loss rule closes everything at your limit.' },
    },
  },
  {
    id: 'night',
    short: '1 am trade',
    emoji: '🌙',
    title: '1 am. Can’t sleep. You open the app.',
    story: 'Bitcoin is moving. You’re in bed with the exchange app open. Nothing has gone wrong yet, and that’s exactly why it feels fine.',
    cells: {
      sl: { v: 'no', why: 'You haven’t placed the trade yet. A stop only exists once you set one.' },
      iso: { v: 'no', why: 'Doesn’t decide whether you trade. Only how much one trade can lose.' },
      screen: { v: 'some', why: 'Downtime can lock the app at night. Easy to switch off, and it doesn’t cover the website on your laptop.' },
      algo: { v: 'no', why: 'Not involved in your manual trades at all.' },
      journal: { v: 'no', why: 'Nothing to record yet.' },
      tgx: { v: 'some', why: 'Only if you’re locked. Arm a 12-hour self-lock before bed and anything you open gets closed. If you’re not locked, it lets the trade through.' },
    },
  },
  {
    id: 'hold',
    short: 'Holding a loser',
    emoji: '🙈',
    title: 'A losing trade with no stop. You’re hoping.',
    story: 'You forgot the stop, or you moved it. Now you’re down and telling yourself it’ll come back.',
    cells: {
      sl: { v: 'no', why: 'There isn’t one. That’s the problem.' },
      iso: { v: 'some', why: 'You can’t lose more than that position’s margin. But that can be all of it.' },
      screen: { v: 'no', why: 'An open position doesn’t care whether the app is closed.' },
      algo: { v: 'no', why: 'Doesn’t manage a trade it didn’t open.' },
      journal: { v: 'no', why: 'Records the result afterwards.' },
      tgx: { v: 'yes', why: 'Can warn you the position has no stop. Either way, open losses count toward your daily limit, so holding a loser still trips it.' },
    },
  },
  {
    id: 'double',
    short: 'Doubling size',
    emoji: '🎲',
    title: 'You double your size to win it back.',
    story: 'Normal size isn’t fixing it fast enough. So you go 2× on the next one. Then 3×.',
    cells: {
      sl: { v: 'no', why: 'A bigger position with a stop is still a bigger loss when the stop hits.' },
      iso: { v: 'some', why: 'Caps the loss at the margin you put in, but you choose that margin, and you just chose more.' },
      screen: { v: 'no', why: 'Has nothing to do with size.' },
      algo: { v: 'no', why: 'Sizes its own strategy. Your manual trades are your business.' },
      journal: { v: 'no', why: 'Will show the pattern later. Useful, but later.' },
      tgx: { v: 'some', why: 'The risk-per-trade rule closes a position that risks more than your limit, as long as it has a stop to measure. Without a stop, the daily loss rule is your backstop.' },
    },
  },
];

/** How many of the four moments each tool fully steps in on. */
export const scoreFor = (toolId) => MOMENTS.filter((m) => m.cells[toolId].v === 'yes').length;
