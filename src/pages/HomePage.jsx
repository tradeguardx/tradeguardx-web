import StoryLanding from '../components/landing/story/StoryLanding';
import { useSEO } from '../hooks/useSEO';

export default function HomePage() {
  useSEO({
    title: 'Protect Every Trade Automatically',
    description: 'TradeGuardX enforces your trading rules in real time — daily loss limits, drawdown protection, hedging prevention, and auto-close. Built for prop traders.',
    url: 'https://tradeguardx.com',
  });
  return <StoryLanding />;
}
