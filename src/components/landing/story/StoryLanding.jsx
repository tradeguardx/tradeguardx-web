import StatsStrip from '../StatsStrip';
import HowItWorksSection from '../HowItWorksSection';
import CostComparisonSection from '../CostComparisonSection';
import CompetitorComparisonSection from '../CompetitorComparisonSection';
import SupportedBrokers from '../SupportedBrokers';
import PropFirmBeat from '../PropFirmBeat';
import FAQ from '../FAQ';
import StoryHero from './StoryHero';
import StoryAIJournal from './StoryAIJournal';
import StoryRulesCatalog from './StoryRulesCatalog';
import StoryProductWalkthrough from './StoryProductWalkthrough';
import StoryReplayBeat from './StoryReplayBeat';

export default function StoryLanding() {
  return (
    <>
      {/* Fixed Sentry-style scatter background — sits behind every section.
          pointer-events: none + z-index: -1 so it never interferes.
          Static twinkling stars only — shooting stars removed per user
          preference. Animations are disabled when prefers-reduced-motion
          is set. */}
      <div className="landing-bg" aria-hidden>
        {/* === Static "distant" stars (small, faint) === */}
        <span className="star star-sm" style={{ top: '17%', left: '88%' }} />
        <span className="star star-sm" style={{ top: '44%', left: '76%' }} />
        <span className="star star-sm" style={{ top: '63%', left: '6%' }} />
        <span className="star star-sm" style={{ top: '83%', left: '24%' }} />

        {/* === Medium blinkers (sparse — the working twinkle layer) === */}
        <span className="star star-md star-blink"      style={{ top: '14%', left: '20%', animationDelay: '0s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '36%', left: '60%', animationDelay: '0.6s' }} />
        <span className="star star-md star-blink"      style={{ top: '54%', left: '12%', animationDelay: '1.4s' }} />
        <span className="star star-md star-blink-slow" style={{ top: '74%', left: '82%', animationDelay: '0.9s' }} />

        {/* === Large "close" stars — bright + slow, rare === */}
        <span className="star star-lg star-blink-slow" style={{ top: '26%', left: '46%', animationDelay: '0.5s' }} />
        <span className="star star-lg star-blink-slow" style={{ top: '90%', left: '70%', animationDelay: '2.1s' }} />

        {/* === Accent (brand green) — just one or two === */}
        <span className="star star-md star-accent star-blink-slow" style={{ top: '48%', left: '90%', animationDelay: '1.0s' }} />
        <span className="star star-lg star-accent star-blink-slow" style={{ top: '66%', left: '34%', animationDelay: '0.8s' }} />
      </div>

      {/* 1. Hero — what is TradeGuardX (now also includes the rule shield
              animation immediately below the headline copy) */}
      <StoryHero />

      {/* 2. Prop-firm wedge beat — surfaces the funded-account audience
              (TFR live, FundedPips/Goat Traders soon) and the ~$300 reset
              vs $25/mo Pro math right under the hero. */}
      <PropFirmBeat />

      {/* 3. Feature strip — rule engine · AI journal · any broker · free */}
      <StatsStrip />

      {/* 3. How it works — 3-step setup */}
      <div className="section-gap" />
      <HowItWorksSection />

      {/* 4. AI Journal — post-mistake story (replaces StoryMistake +
              StoryIntervention which duplicated the hero shield animation).
              Pivots the narrative from "we block" to "we make you better." */}
      <div className="section-gap" />
      <StoryAIJournal />

      {/* 5. What you can enforce — rule engine catalog */}
      <div className="section-gap" />
      <StoryRulesCatalog />

      {/* 6. Cost comparison — losses vs $25/mo */}
      <div className="section-gap" />
      <CostComparisonSection />

      {/* 7. Product walkthrough — real screenshots */}
      <div className="section-gap" />
      <StoryProductWalkthrough />

      {/* 8. Trade replay — journal in action */}
      <div className="section-gap" />
      <StoryReplayBeat />

      {/* 10. Competitor comparison — why TGX vs other tools */}
      <div className="section-gap" />
      <CompetitorComparisonSection />

      {/* 11. Compatibility */}
      <div className="section-gap" />
      <SupportedBrokers />

      {/* 12. FAQ */}
      <div className="section-gap" />
      <FAQ />
    </>
  );
}
