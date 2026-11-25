import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import TutorialsLibrary from '../components/tutorials/TutorialsLibrary';
import { VIDEO_LESSONS, videoObjectFor } from '../content/tutorials';

const SITE = 'https://tradeguardx.com';
const URL = `${SITE}/tutorials`;
const DESCRIPTION = 'Free videos: how to set up a crypto kill switch with a daily loss limit, how rule lock works, whether your API key is safe, and how to connect Exness, Shark Exchange and Bybit.';

/* The course as an ItemList of its videos. Each video is also marked up on
   the page that covers its topic (the API-key guides, /help, /security);
   this page is the collection. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      name: 'Crypto kill switch tutorials',
      url: URL,
      description: DESCRIPTION,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: VIDEO_LESSONS.map((l, i) => ({
          '@type': 'ListItem', position: i + 1, url: `${URL}#${l.key}`, item: videoObjectFor(l.key),
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Tutorials', item: URL },
      ],
    },
  ],
};

/**
 * /tutorials (24 Nov 2026): the playlist as a course, one page. It targets
 * "crypto kill switch tutorials"; each video's own search intent is carried
 * by the existing page it is embedded on, which the lesson links to.
 * Signed-in users get the same library at /dashboard/tutorials.
 */
export default function TutorialsPage() {
  useSEO({
    title: 'Crypto Kill Switch Tutorials: Setup, Exness & Shark API Keys',
    rawTitle: true,
    description: DESCRIPTION,
    url: URL,
    jsonLd,
  });

  return (
    // overflow-x clip, not overflow hidden: hidden would stop the lesson
    // outline from sticking as the page scrolls.
    <div className="relative min-h-screen" style={{ backgroundColor: '#07090f', overflowX: 'clip' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 65%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-[18px] pb-20 pt-24 sm:px-7">
        <header className="max-w-[66ch]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Free video course</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Crypto kill switch tutorials
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            A kill switch in trading closes your positions and locks you out for the day once you hit your daily loss
            limit. These short videos show how to set one up, lock your rules so you can’t undo them mid-day, and
            connect your exchange: Exness, Shark Exchange, Bybit and more.
          </p>
        </header>

        <div className="mt-8">
          <TutorialsLibrary tone="site" />
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3 border-t pt-10" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Link to="/signup" className="rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-surface-950 transition-transform hover:scale-[1.02]">
            Get a 3-day pass
          </Link>
          <Link to="/exchanges" className="rounded-xl border border-white/10 px-6 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:border-white/20">
            Written setup guides
          </Link>
          <Link to="/crypto-kill-switch" className="px-2 py-3.5 text-[14px] font-semibold text-slate-400 hover:text-white">
            What a crypto kill switch does →
          </Link>
        </div>
      </div>
    </div>
  );
}
