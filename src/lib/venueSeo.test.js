import { describe, expect, it } from 'vitest';
import { ENFORCED_RULES, VENUE_ORDER, VENUE_PAGE_LIST, venuePageFor } from './venueSeo';
import { guidesFor } from './venueGuides';
import { PUBLIC_ROUTES, SITEMAP_ROUTES, EXCLUDED_ROUTES } from './publicRoutes';

/**
 * These are not tests of rendering — they are tests of the two things that go
 * wrong silently on an SEO page and cannot be seen by looking at it.
 *
 * One: a title tag that drifts past what Google renders, which truncates the
 * part carrying the query and nothing anywhere reports it.
 *
 * Two: two of our own pages written for the same query. That is the failure this
 * whole restructure exists to avoid — /exchanges/delta/kill-switch competing
 * with /exchanges/delta — and it is invisible until both pages are live and
 * neither ranks.
 */

const TITLE_MAX = 60;

describe('venue page titles', () => {
  it.each(VENUE_ORDER)('%s fits in a search result', (slug) => {
    const v = venuePageFor(slug);
    expect(v.title.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it.each(VENUE_ORDER)('%s names the venue in the title', (slug) => {
    const v = venuePageFor(slug);
    // The venue name is the part of the title doing the work. A title trimmed
    // to fit by dropping it would pass the length check and be worthless.
    expect(v.title).toContain(v.name);
  });

  it('every guide title fits too', () => {
    for (const slug of VENUE_ORDER) {
      for (const g of guidesFor(slug)) {
        expect(g.seoTitle.length, `${slug}/${g.slug}`).toBeLessThanOrEqual(TITLE_MAX);
      }
    }
  });

  it('no two pages share a title', () => {
    const titles = [
      ...VENUE_PAGE_LIST.map((v) => v.title),
      ...VENUE_ORDER.flatMap((s) => guidesFor(s).map((g) => g.seoTitle)),
    ];
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('no two pages share an H1', () => {
    const h1s = [
      ...VENUE_PAGE_LIST.map((v) => v.h1),
      ...VENUE_ORDER.flatMap((s) => guidesFor(s).map((g) => g.title)),
    ];
    expect(new Set(h1s).size).toBe(h1s.length);
  });

  it('meta descriptions stay in the range Google renders', () => {
    for (const v of VENUE_PAGE_LIST) {
      expect(v.description.length, `${v.slug} too short`).toBeGreaterThan(110);
      expect(v.description.length, `${v.slug} too long`).toBeLessThanOrEqual(175);
    }
  });
});

describe('venue page structure', () => {
  const live = VENUE_PAGE_LIST.filter((v) => v.status === 'live');

  it.each(live.map((v) => v.slug))('%s answers the four questions a hub must answer', (slug) => {
    const v = venuePageFor(slug);
    const headings = v.sections.map((s) => s.h).join(' | ');
    expect(headings).toContain('What happens when you breach your limit');
    expect(headings).toContain('rules can TradeGuardX enforce');
    expect(headings).toContain('How do I connect my');
    expect(headings).toContain('Can TradeGuardX withdraw my funds');
  });

  it.each(live.map((v) => v.slug))('%s shows the rules table exactly once', (slug) => {
    const v = venuePageFor(slug);
    expect(v.sections.filter((s) => s.rulesTable)).toHaveLength(1);
  });

  it('every venue has FAQ entries for the FAQPage schema', () => {
    for (const v of VENUE_PAGE_LIST) {
      expect(v.faq.length, v.slug).toBeGreaterThanOrEqual(2);
      for (const f of v.faq) {
        expect(f.q.endsWith('?'), `${v.slug}: "${f.q}"`).toBe(true);
        expect(f.a.length).toBeGreaterThan(40);
      }
    }
  });

  it('every guideLink points at a guide that exists', () => {
    for (const v of VENUE_PAGE_LIST) {
      const slugs = guidesFor(v.slug).map((g) => g.slug);
      for (const s of v.sections.filter((x) => x.guideLink)) {
        expect(slugs, `${v.slug} links to ${s.guideLink}`).toContain(s.guideLink);
      }
    }
  });

  it('every listed venue is one you can actually connect today', () => {
    // There were Bybit and Bitget pages here whose content was "built, not
    // deployed". A venue page that cannot be acted on is a page competing for
    // that venue's name with nothing to offer whoever arrives on it — and the
    // rules table on it reads as "these seven rules work on Bybit".
    for (const v of VENUE_PAGE_LIST) {
      expect(v.status, v.slug).toBe('live');
      expect(v.sections.some((s) => s.rulesTable), v.slug).toBe(true);
      expect(guidesFor(v.slug).length, v.slug).toBeGreaterThan(0);
    }
  });
});

describe('claims we are not allowed to make', () => {
  const allText = [
    ...VENUE_PAGE_LIST.flatMap((v) => [
      v.title,
      v.description,
      v.h1,
      v.lede,
      ...v.sections.flatMap((s) => s.p ?? []),
      ...v.faq.flatMap((f) => [f.q, f.a]),
    ]),
    ...VENUE_ORDER.flatMap((s) =>
      guidesFor(s).flatMap((g) => [g.title, g.description, g.intro, JSON.stringify(g.sections)]),
    ),
  ].join('\n');

  it('states no latency figure', () => {
    /*
     * The homepage once carried "~120ms", and it is not true on every venue:
     * Shark's private socket is a nudge that triggers a REST read, not a feed we
     * parse, so the number was measured somewhere it does not apply. A figure
     * that is right for one venue and published on all of them is a wrong claim
     * on the others, and it is the kind a customer can quote back at you.
     */
    expect(allText).not.toMatch(/\d+\s*(ms|milliseconds)/i);
  });

  it('never names a rule the engine does not implement', () => {
    // rule_templates also carries hedging, minimum-hold and stacking. They were
    // enforced by the frozen browser extension and have no engine rule, so no
    // page may present them as protection.
    for (const phrase of ['hedging', 'minimum hold', 'stacking', 'max position size']) {
      expect(allText.toLowerCase(), phrase).not.toContain(phrase);
    }
  });

  it('never offers a withdrawal permission as a thing to avoid ticking', () => {
    // No venue we support offers the permission at all, which is a stronger
    // fact than "we choose not to ask for it" — and the weaker phrasing
    // invites the question of whether some other tool does.
    expect(allText).not.toMatch(/do not tick\s+withdraw/i);
  });
});

describe('the rules table', () => {
  it('has one row per engine rule', () => {
    // Seven files in tradeguardx-risk-engine/src/rules/: closeAfterLosses,
    // dailyLoss, dailyTarget, maxTotalLoss, maxTradesDay, riskPerTrade,
    // stopLossAlert. If a rule is added to the engine this number changes and
    // this test is the reminder that the public table has to change with it.
    expect(ENFORCED_RULES).toHaveLength(7);
  });

  it('is honest about which rules close something', () => {
    const byKind = ENFORCED_RULES.reduce((acc, r) => {
      acc[r.fires] = (acc[r.fires] ?? 0) + 1;
      return acc;
    }, {});
    expect(byKind.full).toBe(4);
    expect(byKind['one position']).toBe(1);
    expect(byKind['alert only']).toBe(2);
  });

  it('labels Max Drawdown as alert only', () => {
    // The name says floor and the behaviour is a notification. This one row
    // being wrong is the single most expensive mistake available on this page.
    const dd = ENFORCED_RULES.find((r) => r.name.includes('Drawdown'));
    expect(dd.fires).toBe('alert only');
  });
});

describe('the route manifest', () => {
  it('has a page for every venue and every guide', () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(paths).toContain('/exchanges');
    for (const slug of VENUE_ORDER) {
      expect(paths, slug).toContain(`/exchanges/${slug}`);
      for (const g of guidesFor(slug)) {
        expect(paths, `${slug}/${g.slug}`).toContain(`/exchanges/${slug}/${g.slug}`);
      }
    }
  });

  it('never nests deeper than two levels under /exchanges', () => {
    for (const r of PUBLIC_ROUTES.filter((x) => x.path.startsWith('/exchanges'))) {
      expect(r.path.split('/').filter(Boolean).length, r.path).toBeLessThanOrEqual(3);
    }
  });

  it('has no venue page that repeats the venue name in its slug', () => {
    for (const slug of VENUE_ORDER) {
      expect(PUBLIC_ROUTES.map((r) => r.path)).not.toContain(`/exchanges/${slug}-kill-switch`);
      expect(PUBLIC_ROUTES.map((r) => r.path)).not.toContain(`/exchanges/${slug}/kill-switch`);
    }
  });

  it('keeps the indexed head-term pages exactly where they are', () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(paths).toContain('/crypto-kill-switch');
    expect(paths).toContain('/crypto-tax-india');
  });

  it('does not submit /login or the old per-venue setup URL', () => {
    const submitted = SITEMAP_ROUTES.map((r) => r.path);
    expect(submitted).not.toContain('/login');
    expect(submitted).not.toContain('/help/getting-started');
    expect(EXCLUDED_ROUTES['/login']).toBeTruthy();
  });

  it('gives every exclusion a reason', () => {
    // The bar is "a sentence someone can disagree with", not a word count.
    // "Redirects to /help." is a complete reason at 19 characters.
    for (const [path, reason] of Object.entries(EXCLUDED_ROUTES)) {
      expect(reason.trim().length, path).toBeGreaterThan(14);
      expect(reason.trim(), path).toMatch(/\.$/);
    }
  });
});
