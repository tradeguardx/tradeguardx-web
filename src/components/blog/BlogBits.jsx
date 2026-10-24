import { Link } from 'react-router-dom';
import { CATEGORIES, categoryFor, categoryPath, postPath, postsIn } from '../../content/blog/posts';
import { fmtDate } from './visuals/format';
import './blog.css';

const BLOG_BG = '#07090f';

/** The page backdrop every blog page shares: one soft glow, nothing busy. */
export function BlogBackdrop({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: BLOG_BG }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[520px] w-[1000px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.07), transparent 65%)' }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Category chips. `active` is a slug, or null for "All". */
export function CategoryNav({ active }) {
  const chip = (on) =>
    `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
      on ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
    }`;
  return (
    <nav aria-label="Blog categories" className="-mx-6 overflow-x-auto px-6 pb-1">
      <ul className="flex gap-2">
        <li>
          <Link to="/blog" className={chip(!active)} aria-current={!active ? 'page' : undefined}>
            All
          </Link>
        </li>
        {CATEGORIES.map((c) => {
          const n = postsIn(c.slug).length;
          return (
            <li key={c.slug}>
              <Link to={categoryPath(c.slug)} className={chip(active === c.slug)} aria-current={active === c.slug ? 'page' : undefined}>
                {c.name}
                {n > 0 && <span className="ml-1.5 text-[11px] opacity-60">{n}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/*
 * The card art is CSS, not an image: a per-category motif that drifts slowly.
 * It costs nothing to load and every card still looks distinct.
 */
const MOTIFS = {
  'tools-and-comparisons': { a: '#00d4aa', b: '#f59e0b', shape: 'bars' },
  'daily-loss-limits': { a: '#00d4aa', b: '#f43f5e', shape: 'line' },
  overtrading: { a: '#f59e0b', b: '#00d4aa', shape: 'bars' },
  'trading-psychology': { a: '#818cf8', b: '#f43f5e', shape: 'rings' },
  'risk-management': { a: '#00d4aa', b: '#818cf8', shape: 'bars' },
  'leverage-and-liquidation': { a: '#f43f5e', b: '#f59e0b', shape: 'line' },
  'crypto-tax-india': { a: '#38bdf8', b: '#00d4aa', shape: 'rings' },
};

export function CardArt({ category, big = false }) {
  const m = MOTIFS[category] ?? MOTIFS['daily-loss-limits'];
  return (
    <div
      className={`relative overflow-hidden ${big ? 'h-56 md:h-full md:min-h-[260px]' : 'h-36'}`}
      style={{ background: `radial-gradient(120% 120% at 0% 100%, ${m.a}22, transparent 55%), radial-gradient(120% 120% at 100% 0%, ${m.b}1a, transparent 55%), #0b0f17` }}
      aria-hidden
    >
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="rgba(255,255,255,.04)" />
        ))}
        {m.shape === 'line' && (
          <>
            <line x1="0" x2="400" y1="120" y2="120" stroke={m.b} strokeOpacity=".6" strokeDasharray="6 6" />
            <path
              d="M0 70 L50 60 L90 85 L130 75 L170 100 L210 95 L250 122 L400 122"
              fill="none"
              stroke={m.a}
              strokeWidth="3"
              className="bv-card-line"
            />
          </>
        )}
        {m.shape === 'bars' &&
          [30, 70, 110, 150, 190, 230, 270, 310, 350].map((x, i) => (
            <rect
              key={x}
              x={x}
              width="18"
              y={200 - (40 + ((i * 37) % 110))}
              height={40 + ((i * 37) % 110)}
              rx="3"
              fill={i % 3 === 2 ? m.b : m.a}
              fillOpacity=".55"
              className="bv-card-bar"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        {m.shape === 'rings' &&
          [30, 60, 90].map((r, i) => (
            <circle key={r} cx="300" cy="100" r={r} fill="none" stroke={i === 1 ? m.b : m.a} strokeOpacity=".5" strokeWidth="2" className="bv-card-ring" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
      </svg>
    </div>
  );
}

export function PostCard({ post, big = false }) {
  const cat = categoryFor(post.category);
  return (
    <Link
      to={postPath(post.slug)}
      className={`group block overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:border-white/20 ${
        big ? 'md:grid md:grid-cols-[1.1fr_1fr]' : ''
      }`}
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <CardArt category={post.category} big={big} />
      <div className={big ? 'p-6 md:p-8' : 'p-5'}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{cat?.name}</p>
        <h3 className={`mt-2 font-display font-bold leading-snug text-white group-hover:text-accent ${big ? 'text-2xl md:text-3xl' : 'text-[18px]'}`}>
          {post.title}
        </h3>
        <p className={`mt-3 leading-relaxed text-slate-400 ${big ? 'text-[15px]' : 'line-clamp-3 text-[14px]'}`}>{post.dek}</p>
        <p className="mt-4 text-[12px] text-slate-500">
          {fmtDate(post.updated)} · {post.readMins} min read
        </p>
      </div>
    </Link>
  );
}

/** A planned post: shown, not linked. Honest about being unwritten. */
export function PlannedCard({ item }) {
  const cat = categoryFor(item.category);
  return (
    <div className="rounded-2xl border border-dashed px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {cat?.name} · <span className="text-amber-400/80">In the works</span>
      </p>
      <p className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-300">{item.title}</p>
    </div>
  );
}
