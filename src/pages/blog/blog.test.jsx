import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CATEGORIES, PLANNED, POSTS, categoryIndexable, categoryPath, postPath } from '../../content/blog/posts';
import { PUBLIC_ROUTES, SITEMAP_ROUTES } from '../../lib/publicRoutes';
import { HELP_ARTICLES } from '../../lib/exchangeDocs';
import { VENUE_PAGE_LIST } from '../../lib/venueSeo';
import { computeLimit, verdictFor } from '../../components/blog/visuals/lossLimit';
import { ARTICLES } from './articles';
import BlogPostPage from './BlogPostPage';

/*
 * The same two silent failures the venue tests guard: a <title> that Google
 * truncates, and two of our own pages aimed at one query. Plus the blog's own:
 * a table of contents pointing at headings that do not exist, and maths in a
 * calculator that quietly disagrees with the article around it.
 */

const TITLE_MAX = 60;

describe('blog posts', () => {
  it('have unique slugs and existing categories', () => {
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length);
    const cats = CATEGORIES.map((c) => c.slug);
    for (const p of POSTS) expect(cats, p.slug).toContain(p.category);
    for (const p of PLANNED) expect(cats, p.title).toContain(p.category);
  });

  it('fit their titles and descriptions in a search result', () => {
    for (const p of POSTS) {
      expect(p.seoTitle.length, p.slug).toBeLessThanOrEqual(TITLE_MAX);
      expect(p.description.length, `${p.slug} too short`).toBeGreaterThan(110);
      expect(p.description.length, `${p.slug} too long`).toBeLessThanOrEqual(160);
    }
  });

  it('do not share a title or H1 with any other page on the site', () => {
    const others = [
      ...VENUE_PAGE_LIST.flatMap((v) => [v.title, v.h1]),
      ...HELP_ARTICLES.map((a) => a.title),
    ].map((t) => t.toLowerCase());
    for (const p of POSTS) {
      expect(others).not.toContain(p.seoTitle.toLowerCase());
      expect(others).not.toContain(p.title.toLowerCase());
    }
    const all = POSTS.flatMap((p) => [p.seoTitle, p.title]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('never targets the head term /crypto-kill-switch owns', () => {
    for (const p of POSTS) expect(p.seoTitle.toLowerCase()).not.toMatch(/^(the )?(crypto )?kill ?switch/);
  });

  it('each have an article module with a FAQ whose questions are questions', () => {
    for (const p of POSTS) {
      const mod = ARTICLES[p.slug];
      expect(mod?.default, p.slug).toBeTypeOf('function');
      for (const f of mod.faq ?? []) {
        expect(f.q.endsWith('?'), f.q).toBe(true);
        expect(f.a.length).toBeGreaterThan(60);
      }
    }
  });

  it('are prerendered and submitted', () => {
    const submitted = SITEMAP_ROUTES.map((r) => r.path);
    for (const p of POSTS) expect(submitted).toContain(postPath(p.slug));
    expect(submitted).toContain('/blog');
  });
});

describe('blog categories', () => {
  it('are always prerendered, and submitted only once they are not thin', () => {
    for (const c of CATEGORIES) {
      const route = PUBLIC_ROUTES.find((r) => r.path === categoryPath(c.slug));
      expect(route, c.slug).toBeTruthy();
      expect(route.sitemap, c.slug).toBe(categoryIndexable(c.slug));
    }
  });

  it('fit their titles in a search result', () => {
    for (const c of CATEGORIES) {
      expect(`${c.name} — Crypto Trading Blog — TradeGuardX`.length, c.slug).toBeLessThanOrEqual(TITLE_MAX);
    }
  });
});

describe.each(POSTS.map((p) => [p.slug]))('%s renders', (slug) => {
  const renderPost = () =>
    render(
      <MemoryRouter initialEntries={[postPath(slug)]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPostPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('with exactly one H1', () => {
    const { container } = renderPost();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('with every table-of-contents entry pointing at a real heading', () => {
    const { container } = renderPost();
    for (const t of ARTICLES[slug].toc) {
      const el = container.querySelector(`#${t.id}`);
      expect(el, `#${t.id}`).not.toBeNull();
      expect(el.tagName, t.id).toBe('H2');
    }
  });
});

describe('the calculator agrees with the article', () => {
  it('₹1,00,000 at 1% and 2.5R is ₹2,500 a day with 8 days of runway', () => {
    const r = computeLimit({ capital: 100000, riskPct: 1, losses: 2.5 });
    expect(r.r).toBe(1000);
    expect(r.limit).toBe(2500);
    expect(r.runway).toBe(8);
    expect(r.warnAt).toBe(1500);
  });

  it('2% a day gives 11 days and 5% gives 4, as the copy says', () => {
    expect(computeLimit({ capital: 100000, riskPct: 1, losses: 2 }).runway).toBe(11);
    expect(computeLimit({ capital: 100000, riskPct: 2, losses: 2.5 }).runway).toBe(4);
  });

  it('calls 2–3% balanced and 10% too wide', () => {
    expect(verdictFor(2.5).label).toBe('Balanced');
    expect(verdictFor(10).label).toBe('Too wide');
    expect(verdictFor(0.5).label).toBe('Tight');
  });
});
