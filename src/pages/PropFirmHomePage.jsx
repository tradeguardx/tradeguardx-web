import StoryLanding from '../components/propfirm/story/StoryLanding';
import { faqs } from '../components/propfirm/FAQ';
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

export default function PropFirmHomePage() {
  useSEO({
    title: 'TradeGuardX — Rule enforcement for prop firm & funded traders',
    description:
      'Pass the challenge and protect your funded account. TradeGuardX enforces your daily loss, drawdown, and risk limits in real time across prop firms like Exness and The Funded Room — so a single tilt session never breaches your account.',
    url: 'https://tradeguardx.com/prop-firm',
    jsonLd: faqJsonLd,
  });
  return <StoryLanding />;
}
