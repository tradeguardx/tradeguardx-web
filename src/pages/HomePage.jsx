import StoryLanding from '../components/landing/story/StoryLanding';
import { faqs } from '../components/landing/FAQ';
import { useSEO } from '../hooks/useSEO';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

/**
 * The pre-crypto-reframe homepage, kept as a reference layout at /home-classic.
 *
 * `noindex` is passed by that route. It already canonicalised to "/", which
 * should be enough on its own, but a second full copy of the homepage is
 * exactly the thing Google picks as the canonical when it disagrees with you —
 * and losing / to /home-classic for the brand query would be a bad afternoon.
 * Two signals instead of one.
 */
export default function HomePage({ noindex = false }) {
  useSEO({
    noindex,
    title: 'TradeGuardX — India’s first risk engine for crypto traders',
    description:
      'India’s first real-time risk enforcement for crypto. Connect Delta Exchange or CoinDCX — the moment you breach a daily-loss, tilt, overtrading, or risk-per-trade limit you set, we auto-close your positions and lock the account.',
    url: 'https://tradeguardx.com',
    jsonLd: faqJsonLd,
  });
  return <StoryLanding />;
}
