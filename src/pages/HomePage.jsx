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
    title: 'Pass your prop eval. Don’t fail it on a bad day',
    description:
      'Browser extension that enforces your prop firm’s rules in real time — daily loss, drawdown, hedging, lot size. Block the violation before it triggers a reset.',
    url: 'https://tradeguardx.com',
    jsonLd: faqJsonLd,
  });
  return <StoryLanding />;
}
