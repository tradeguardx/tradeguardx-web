import SocialProof from '../SocialProof';
import ProtectionDemo from '../ProtectionDemo';
import SupportedBrokers from '../SupportedBrokers';
import FAQ from '../FAQ';
import StoryHero from './StoryHero';
import StoryMistake from './StoryMistake';
import StoryIntervention from './StoryIntervention';
import StoryRulesCatalog from './StoryRulesCatalog';
import StoryProductWalkthrough from './StoryProductWalkthrough';
import StoryRuleEngineViz from './StoryRuleEngineViz';
import StoryReplayBeat from './StoryReplayBeat';
import StoryDisciplineTransform from './StoryDisciplineTransform';
import StoryFinalCTA from './StoryFinalCTA';

/**
 * Cinematic scroll narrative — “experience before signup”.
 * Composes hero → emotional arc → product walkthrough → close.
 */
export default function StoryLanding() {
  return (
    <>
      <StoryHero />
      {/* Preserve deep-link from marketing / footer “how it works” */}
      <div id="how-it-works" className="sr-only" aria-hidden />
      <SocialProof />
      <div className="section-gap" />
      <StoryMistake />
      <div className="section-gap" />
      <StoryIntervention />
      <div className="section-gap" />
      <StoryRulesCatalog />
      <div className="section-gap" />
      <StoryProductWalkthrough />
      <div className="section-gap" />
      <StoryRuleEngineViz />
      <div className="section-gap" />
      <StoryReplayBeat />
      <div className="section-gap" />
      <StoryDisciplineTransform />
      <div className="section-gap" />
      <StoryFinalCTA />
      <div className="section-gap" />
      <ProtectionDemo />
      <div className="section-gap" />
      <SupportedBrokers />
      <div className="section-gap" />
      <FAQ />
    </>
  );
}
