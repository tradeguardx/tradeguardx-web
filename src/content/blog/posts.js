/**
 * The blog: categories, published posts, and the planned backlog.
 *
 * Plain ESM with no JSX — publicRoutes.js reads this to prerender and submit
 * every post, and that file is loaded by a bare `node scripts/...` as well as
 * by Vite. The article bodies live in ./articles and are mapped to slugs in
 * src/pages/blog/articles.js.
 *
 * The category set started from what the Indian F&O risk-tool sites rank for
 * (overtrading, daily loss limit, revenge trading, risk management) and was
 * re-cut for crypto futures, which has two problems F&O does not: leverage
 * that turns a 1% move into a margin call, and a market with no closing bell.
 *
 * A category page is NOINDEX until it holds MIN_POSTS_TO_INDEX posts. A
 * category with one article is a thin page that duplicates that article's
 * listing, and Google judges the whole /blog section by its weakest pages.
 */

export const MIN_POSTS_TO_INDEX = 3;

export const CATEGORIES = [
  {
    slug: 'tools-and-comparisons',
    name: 'Tools & Comparisons',
    blurb: 'Honest comparisons of the tools crypto traders use to control risk, including when you don’t need ours.',
  },
  {
    slug: 'daily-loss-limits',
    name: 'Daily Loss Limits',
    blurb: 'How much you can lose in a day, how to calculate it, and how to make it actually stop you.',
  },
  {
    slug: 'overtrading',
    name: 'Overtrading',
    blurb: 'Why a market that never closes makes it so easy to take one trade too many, and how to cap it.',
  },
  {
    slug: 'trading-psychology',
    name: 'Trading Psychology',
    blurb: 'Revenge trading, tilt, and the late-night session — the behaviour that blows accounts, not the setups.',
  },
  {
    slug: 'risk-management',
    name: 'Risk Management',
    blurb: 'Position sizing in rupees, risk per trade, and the rules that keep a bad week from becoming a bad year.',
  },
  {
    slug: 'leverage-and-liquidation',
    name: 'Leverage & Liquidation',
    blurb: 'What leverage really multiplies, why a liquidation price is not a stop loss, and how margin modes change the maths.',
  },
  {
    slug: 'crypto-tax-india',
    name: 'Crypto Tax India',
    blurb: 'How Indian rules treat crypto futures and VDA trades, written to be checked with your CA, not instead of one.',
  },
];

/**
 * Published posts, newest first. `seoTitle` is the <title> verbatim (no brand
 * suffix) and must fit in 60 characters; `title` is the H1 and can run longer.
 */
export const POSTS = [
  {
    slug: 'best-crypto-risk-management-tools-india',
    category: 'tools-and-comparisons',
    seoTitle: 'Best Crypto Risk Management Tools in India (2026)',
    title: 'The best crypto risk management tools in India, explained simply',
    dek: 'Stop-losses, isolated margin, screen-time limits, algo platforms and kill switches, tested against the four moments where traders actually lose money. We make one of them, so we say where it’s the wrong pick.',
    description:
      'Crypto risk tools for Indian traders, compared in plain English: stop-loss, isolated margin, screen time, Tradetron and kill switches, tested on bad days.',
    published: '2026-10-13',
    updated: '2026-10-13',
    readMins: 9,
  },
  {
    slug: 'daily-loss-limit-crypto-futures',
    category: 'daily-loss-limits',
    seoTitle: 'Daily Loss Limit for Crypto Futures: How to Calculate Yours',
    title: 'How to set a daily loss limit for crypto futures (with a calculator)',
    dek: 'A four-step method to pick the number, the crypto-specific settings that F&O guides skip, and why a limit you enforce yourself fails on exactly the day you need it.',
    description:
      'Calculate your daily loss limit for crypto futures in rupees: risk per trade, the 2–3R rule, a 24/7 reset hour, fees, and a free calculator for Indian traders.',
    published: '2026-10-13',
    updated: '2026-10-13',
    readMins: 11,
  },
];

/**
 * The editorial backlog, by category. Shown on category pages as "next up" so
 * a new category reads as a plan rather than an empty room, and kept here so
 * the content plan lives next to the content. Each one gets its own research
 * pass when it is written — these are working titles, not promises of copy.
 */
export const PLANNED = [
  { category: 'tools-and-comparisons', title: 'Trading discipline apps for crypto traders in India, compared' },
  { category: 'tools-and-comparisons', title: 'Do phone screen-time limits stop overtrading? We tested them' },
  { category: 'tools-and-comparisons', title: 'Stop-loss vs kill switch: do you need both?' },
  { category: 'overtrading', title: 'Overtrading in crypto futures: why it happens and how to stop' },
  { category: 'overtrading', title: 'How many trades a day should a crypto futures trader take?' },
  { category: 'daily-loss-limits', title: 'You hit your daily loss limit. What to do with the rest of the day' },
  { category: 'trading-psychology', title: 'Revenge trading in crypto: the forty-minute spiral' },
  { category: 'trading-psychology', title: 'Why crypto traders blow their accounts: the real reasons' },
  { category: 'trading-psychology', title: 'Trading at 2am: the problem with a market that never closes' },
  { category: 'risk-management', title: 'Position sizing for crypto futures, in rupees' },
  { category: 'risk-management', title: 'Stop loss vs kill switch: what each one actually protects' },
  { category: 'risk-management', title: 'How to stop losing money in crypto futures: five changes that work' },
  { category: 'leverage-and-liquidation', title: 'Your liquidation price is not a stop loss' },
  { category: 'leverage-and-liquidation', title: 'Isolated vs cross margin on Indian crypto exchanges' },
  { category: 'crypto-tax-india', title: 'Crypto futures losses in India: what you can and cannot set off' },
];

export const categoryFor = (slug) => CATEGORIES.find((c) => c.slug === slug);
export const postFor = (slug) => POSTS.find((p) => p.slug === slug);
export const postsIn = (category) => POSTS.filter((p) => p.category === category);
export const plannedIn = (category) => PLANNED.filter((p) => p.category === category);
export const categoryIndexable = (category) => postsIn(category).length >= MIN_POSTS_TO_INDEX;

export const postPath = (slug) => `/blog/${slug}`;
export const categoryPath = (slug) => `/blog/category/${slug}`;
