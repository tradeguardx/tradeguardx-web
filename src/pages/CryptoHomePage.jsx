import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSEO } from '../hooks/useSEO';
import StoryAIJournal from '../components/landing/story/StoryAIJournal';
import FloatingSignupCTA from '../components/landing/FloatingSignupCTA';
import DemoVideoSection from '../components/landing/DemoVideoSection';
import HeroLiveDemo from '../components/landing/HeroLiveDemo';
import '../landing/tgx.scoped.css';
import rawBodyA from '../landing/tgx-body-a.html?raw';
import rawBodyB from '../landing/tgx-body-b.html?raw';

// Split the landing body right after the hero (before the trust strip) so the
// Talk-to-founder banner sits between the hero and the "7 rules / 7 days /
// <120ms" strip. The two halves each get their own ref, both registered with the
// reveal/animation effect below.
const SPLIT_MARKER = '<!-- POST HERO';
const _splitIdx = rawBodyA.indexOf(SPLIT_MARKER);
const rawBodyAHero = _splitIdx >= 0 ? rawBodyA.slice(0, _splitIdx) : rawBodyA;
// After the hero: "A day in the life" + rules.
const rawBodyARest = _splitIdx >= 0 ? rawBodyA.slice(_splitIdx) : '';

// Split body-b at pricing so the how-to-setup demo lands as the last proof
// before we show the price.
const PRICING_MARKER = '<!-- PRICING SPLIT -->';
const _bIdx = rawBodyB.indexOf(PRICING_MARKER);
const rawBodyBHead = _bIdx >= 0 ? rawBodyB.slice(0, _bIdx) : rawBodyB;   // Available on
const rawBodyBTail = _bIdx >= 0 ? rawBodyB.slice(_bIdx) : '';            // Pricing + FAQ

// Reveal/stagger targets — verbatim from the source <script>.
const REVEAL_TARGETS = [
  '.section-head', '.ks-section-head', '.pain-card', '.step-card', '.rule-card',
  '.price-card', '.journal-card', '.enforce-item', '.alert-card-static',
  '.terminal', '.device', '.phone-frame', '.cost-note', '.latency-stat',
  '.mobile-text', '.faq-item', '.trust-stat',
];
const STAGGER_CONTAINERS = [
  '.pain-grid', '.steps', '.rules-grid', '.price-grid', '.journal-grid',
  '.alert-cards', '.channel-row', '.faq-list',
];

/**
 * Section rule — a hairline that fades out at both ends so it reads as a soft
 * separator on the dark background rather than a hard border.
 */
function LandingDivider() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-[18px] sm:px-7" aria-hidden>
      <div
        className="h-px w-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 15%, rgba(255,255,255,0.10) 85%, transparent)' }}
      />
    </div>
  );
}

const RawHtml = memo(function RawHtml({ html, innerRef, className }) {
  return <div className={className} ref={innerRef} dangerouslySetInnerHTML={{ __html: html }} />;
});

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    ['Will TradeGuardX have access to my funds?', 'No. Your Delta Exchange API key only has trade and balance-read scope — it can never withdraw, and your funds never leave your own Delta wallet. During a cooldown we don’t move funds; we cancel orders, close positions, and block new trades until the lock lifts.'],
    ['Does this work on the Delta Exchange mobile app?', 'Yes. Enforcement is server-side via Delta Exchange’s API, so it works whether you trade from web, mobile, or a third-party client. We detect a trade within ~120ms and act if it breaks a rule. Alerts go to WhatsApp, Telegram, or email.'],
    ['Can I disable the rules when I want to trade more?', 'You can change rules in your dashboard, but loosening any limit goes through a 24-hour cooling-off window — you cannot loosen a rule in the heat of a bad session. You can tighten any rule instantly.'],
    ['Why Delta Exchange first and when does CoinDCX go live?', 'Delta Exchange has the most granular, stable perp API in India. CoinDCX integration is in active build, targeting public launch within 30 days; Pro subscribers get it at no extra cost.'],
  ].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

export default function CryptoHomePage() {
  const aRef = useRef(null);
  const a2Ref = useRef(null);
  const bRef = useRef(null);
  const bTailRef = useRef(null);
  const [heroDemoNode, setHeroDemoNode] = useState(null);

  useSEO({
    title: "India's First Crypto Trading Kill Switch",
    description:
      "Never blow another trading account. Set daily-loss, max-trades, position-size and cooldown rules once — TradeGuardX blocks new orders, closes open positions, and locks your account the moment you break a limit. Built for Delta Exchange; CoinDCX next.",
    url: 'https://tradeguardx.com',
    jsonLd: FAQ_LD,
  });

  // The hero is injected as raw HTML, so the animated device is portalled into a
  // placeholder inside it rather than rewriting the whole hero as JSX.
  useEffect(() => {
    const root = aRef.current;
    if (!root) return undefined;

    const acquire = () => {
      const next = root.querySelector('#tgx-hero-demo') ?? null;
      // Re-point only when the node we hold is gone or replaced. Anything that
      // re-sets this subtree's innerHTML (an HMR update, a future re-render of
      // the raw HTML) detaches the placeholder, and a portal into a detached
      // node renders nothing — the demo silently disappears until reload.
      setHeroDemoNode((prev) => (prev && prev.isConnected && prev === next ? prev : next));
    };

    acquire();
    const mo = new MutationObserver(acquire);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const roots = [aRef.current, a2Ref.current, bRef.current, bTailRef.current].filter(Boolean);
    if (!roots.length) return;
    const qAll = (sel) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observers = [];
    const cleanups = [];

    if (!reduceMotion) {
      REVEAL_TARGETS.forEach((sel) => qAll(sel).forEach((el) => el.classList.add('reveal')));
      STAGGER_CONTAINERS.forEach((sel) => qAll(sel).forEach((el) => el.classList.add('stagger')));

      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      qAll('.reveal, .stagger').forEach((el) => io.observe(el));

      const termIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('live'); termIo.unobserve(e.target); } });
      }, { threshold: 0.3 });
      qAll('.terminal-body').forEach((t) => termIo.observe(t));

      const countIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.target.dataset.counted) return;
          entry.target.dataset.counted = '1';
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10) || 0;
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';
          const useFormat = el.dataset.format === 'comma';
          const duration = 1400;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const val = Math.floor(eased * target);
            el.textContent = prefix + (useFormat ? val.toLocaleString('en-IN') : val) + suffix;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          countIo.unobserve(el);
        });
      }, { threshold: 0.5 });
      qAll('.counter').forEach((c) => countIo.observe(c));

      const scIo = new IntersectionObserver((entries) => {
        entries.forEach((e) => { e.target.classList.toggle('playing', e.isIntersecting); });
      }, { threshold: 0.35 });
      qAll('.scenario-card').forEach((c) => scIo.observe(c));

      observers.push(io, termIo, countIo, scIo);

      qAll('[data-cooldown]').forEach((el) => {
        const base = parseInt(el.dataset.cooldown, 10) || 14400;
        let seconds = base;
        const fmt = (s) => [s / 3600, (s % 3600) / 60, s % 60]
          .map((x) => String(Math.floor(x)).padStart(2, '0')).join(':');
        const id = setInterval(() => {
          const card = el.closest('.scenario-card');
          if (!card || !card.classList.contains('playing')) return;
          seconds--;
          if (seconds < base - 360) seconds = base;
          el.textContent = fmt(seconds);
        }, 1000);
        cleanups.push(() => clearInterval(id));
      });
    } else {
      qAll('.counter').forEach((el) => {
        const target = parseInt(el.dataset.target, 10) || 0;
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const useFormat = el.dataset.format === 'comma';
        el.textContent = prefix + (useFormat ? target.toLocaleString('en-IN') : target) + suffix;
      });
    }

    qAll('a[href^="#"]').forEach((a) => {
      const onClick = (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(`.tgx-home ${id}`) || document.querySelector(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
      };
      a.addEventListener('click', onClick);
      cleanups.push(() => a.removeEventListener('click', onClick));
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      {heroDemoNode && createPortal(<HeroLiveDemo />, heroDemoNode)}

      {/* Same star-scatter background as /prop-firm */}
      <div className="landing-bg" aria-hidden>
        <span className="star star-sm" style={{ top: '17%', left: '88%' }} />
        <span className="star star-sm" style={{ top: '44%', left: '76%' }} />
        <span className="star star-sm" style={{ top: '63%', left: '6%' }} />
        <span className="star star-sm" style={{ top: '83%', left: '24%' }} />
        <span className="star star-md star-blink" style={{ top: '14%', left: '20%', animationDelay: '0s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '36%', left: '60%', animationDelay: '0.6s' }} />
        <span className="star star-md star-blink" style={{ top: '54%', left: '12%', animationDelay: '1.4s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '74%', left: '82%', animationDelay: '0.9s' }} />
        <span className="star star-lg star-blink-slow" style={{ top: '26%', left: '46%', animationDelay: '0.5s' }} />
        <span className="star star-lg star-blink-slow" style={{ top: '90%', left: '70%', animationDelay: '2.1s' }} />
        <span className="star star-md star-accent star-blink-slow" style={{ top: '48%', left: '90%', animationDelay: '1.0s' }} />
        <span className="star star-lg star-accent star-blink-slow" style={{ top: '66%', left: '34%', animationDelay: '0.8s' }} />
      </div>

      <RawHtml className="tgx-home" innerRef={aRef} html={rawBodyAHero} />
      {/* A day in the life + rules — straight after the hero. */}
      <RawHtml className="tgx-home" innerRef={a2Ref} html={rawBodyARest} />
      <StoryAIJournal />
      {/* Available on. */}
      <RawHtml className="tgx-home" innerRef={bRef} html={rawBodyBHead} />
      <LandingDivider />
      {/* How to set up — the last proof before the price. Plays in a lightbox. */}
      <DemoVideoSection />
      <LandingDivider />
      {/* Pricing + FAQ. */}
      <RawHtml className="tgx-home" innerRef={bTailRef} html={rawBodyBTail} />
      <FloatingSignupCTA />
    </>
  );
}
