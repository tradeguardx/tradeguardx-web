import Hero from '../components/landing/Hero';
import HowItWorksDetail from '../components/landing/HowItWorksDetail';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import WorksWithYourStyleSection from '../components/landing/WorksWithYourStyleSection';
import SupportedBrokers from '../components/landing/SupportedBrokers';
import SecurityPrivacySection from '../components/landing/SecurityPrivacySection';
import ProductPreview from '../components/landing/ProductPreview';
import DashboardPreview from '../components/landing/DashboardPreview';
import PropFirmSection from '../components/landing/PropFirmSection';
import CTA from '../components/landing/CTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorksDetail />
      <Features />
      <HowItWorks />
      <Benefits />
      <WorksWithYourStyleSection />
      <SupportedBrokers />
      <SecurityPrivacySection />
      <ProductPreview />
      <DashboardPreview />
      <PropFirmSection />
      <CTA />
    </>
  );
}
