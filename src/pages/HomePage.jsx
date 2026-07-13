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

export default function HomePage() {
  useSEO({
    title: 'TradeGuardX — India’s first risk engine for crypto traders',
    description:
      'India’s first real-time risk enforcement for crypto. Connect Delta Exchange — the moment you breach a daily-loss, tilt, overtrading, or risk-per-trade limit you set, we auto-close your positions and lock the account. CoinDCX coming soon.',
    url: 'https://tradeguardx.com',
    jsonLd: faqJsonLd,
  });
  return <StoryLanding />;
}
