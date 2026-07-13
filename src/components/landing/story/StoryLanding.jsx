import { MotionConfig } from 'framer-motion';
import CryptoTrustStrip from '../CryptoTrustStrip';
import ProblemSection from '../ProblemSection';
import CryptoHowItWorks from '../CryptoHowItWorks';
import EnforceTerminal from '../EnforceTerminal';
import KillSwitchSection from '../KillSwitchSection';
import DayInLife from '../DayInLife';
import RulesGrid from '../RulesGrid';
import MobileAlertsSection from '../MobileAlertsSection';
import PricingSection from '../PricingSection';
import FAQ from '../FAQ';
import StoryHero from './StoryHero';
import StoryAIJournal from './StoryAIJournal';

export default function StoryLanding() {
  return (
    <MotionConfig reducedMotion="never">
      {/* Fixed Sentry-style scatter background — sits behind every section. */}
      <div className="landing-bg" aria-hidden>
        <span className="star star-sm" style={{ top: '17%', left: '88%' }} />
        <span className="star star-sm" style={{ top: '44%', left: '76%' }} />
        <span className="star star-sm" style={{ top: '63%', left: '6%' }} />
        <span className="star star-sm" style={{ top: '83%', left: '24%' }} />
        <span className="star star-md star-blink"      style={{ top: '14%', left: '20%', animationDelay: '0s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '36%', left: '60%', animationDelay: '0.6s' }} />
        <span className="star star-md star-blink"      style={{ top: '54%', left: '12%', animationDelay: '1.4s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '74%', left: '82%', animationDelay: '0.9s' }} />
        <span className="star star-lg star-blink-slow" style={{ top: '26%', left: '46%', animationDelay: '0.5s' }} />
        <span className="star star-lg star-blink-slow" style={{ top: '90%', left: '70%', animationDelay: '2.1s' }} />
        <span className="star star-md star-accent star-blink-slow" style={{ top: '48%', left: '90%', animationDelay: '1.0s' }} />
        <span className="star star-lg star-accent star-blink-slow" style={{ top: '66%', left: '34%', animationDelay: '0.8s' }} />
      </div>

      {/* 1. Hero — kill switch for crypto + live dashboard device */}
      <StoryHero />

      {/* 2. Trust strip — Delta/CoinDCX + headline stats */}
      <CryptoTrustStrip />

      {/* 3. Problem — you lose to yourself (pain cards) */}
      <ProblemSection />

      {/* 4. How it works — up and running in 3 steps */}
      <CryptoHowItWorks />

      {/* 5. Watch → Notify → Enforce — live rule-engine terminal */}
      <EnforceTerminal />

      {/* 6. The Kill Switch — three graduated modes */}
      <KillSwitchSection />

      {/* 7. A day in the life — the modes playing out across one bad session */}
      <DayInLife />

      {/* 8. Rules grid — the rails that match your plan */}
      <RulesGrid />

      {/* 8. Screen-off coverage — phone + multi-channel alerts */}
      <MobileAlertsSection />

      {/* 9. AI journal — get better after every trade */}
      <div className="section-gap" />
      <StoryAIJournal />

      {/* 10. Pricing — Free / Pro on-page */}
      <PricingSection />

      {/* 11. FAQ */}
      <div className="section-gap" />
      <FAQ />
    </MotionConfig>
  );
}
