import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import CryptoHomePage from './pages/CryptoHomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import PartnerApplyPage from './pages/PartnerApplyPage';
import DocsPage from './pages/DocsPage';
import SecurityPage from './pages/SecurityPage';
import RoadmapPage from './pages/RoadmapPage';
import RiskDisclosurePage from './pages/RiskDisclosurePage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import InfluencerLayout from './components/influencer/InfluencerLayout';
import InfluencerOverview from './pages/influencer/InfluencerOverview';
import InfluencerCommissions from './pages/influencer/InfluencerCommissions';
import InfluencerPayouts from './pages/influencer/InfluencerPayouts';
import OverviewPage from './pages/OverviewPage';
import RulesTerminal from './components/dashboard/RulesTerminal';
import JournalPage from './pages/JournalPage';
import EconomicCalendarPage from './pages/EconomicCalendarPage';
import AllTradesPage from './pages/AllTradesPage';
import LiveGuardPage from './pages/LiveGuardPage';
import TradeDetailPage from './pages/TradeDetailPage';
import AccountsPage from './pages/AccountsPage';
import AccountLayout from './pages/AccountLayout';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CryptoKillSwitchPage from './pages/CryptoKillSwitchPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SecuritySettingsPage from './pages/SecuritySettingsPage';
import TaxPage from './pages/TaxPage';
import AccountOverviewPage from './pages/AccountOverviewPage';
import AlertsPage from './pages/AlertsPage';
import RedirectWithSearch from './pages/RedirectWithSearch';
import BillingPage from './pages/BillingPage';
import ConnectKeyPage from './pages/ConnectKeyPage';
import PreferencesPage from './pages/PreferencesPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import ReferralCapture from './components/common/ReferralCapture';
import CommandMenu from './components/common/CommandMenu';
import { ToastProvider } from './components/common/ToastProvider';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import VercelRouteAnalytics from './components/common/VercelRouteAnalytics';
import AnalyticsRouteTracker from './components/common/AnalyticsRouteTracker';

function App() {
  return (
    <AppErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <VercelRouteAnalytics />
              <AnalyticsRouteTracker />
              <ScrollToTop />
              <ReferralCapture />
              <CommandMenu />
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<CryptoHomePage />} />
                  <Route path="home-classic" element={<HomePage />} />
                  {/* Prop-firm page hidden for launch — redirect to the crypto home. */}
                  <Route path="prop-firm" element={<Navigate to="/" replace />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignupPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="verify-email" element={<VerifyEmailPage />} />
                  {/* Opened from the emailed recovery link — public, since the
                      recovery session is what authorises the change. */}
                  <Route path="reset-password" element={<ResetPasswordPage />} />
                  <Route path="support" element={<SupportPage />} />
                  {/* Beta program retired — redirect old links to signup (free trial). */}
                  <Route path="beta-traders" element={<Navigate to="/signup" replace />} />
                  <Route path="beta-testers" element={<Navigate to="/signup" replace />} />
                  <Route path="privacy" element={<PrivacyPolicyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="refund" element={<RefundPolicyPage />} />
                  <Route path="risk-disclosure" element={<RiskDisclosurePage />} />
                  <Route path="partner-with-us" element={<PartnerApplyPage />} />
                  {/* /help now serves the exchange docs (navbar "Guides" → /help). */}
                  <Route path="help" element={<DocsPage />} />
                  <Route path="help/:slug" element={<DocsPage />} />
                  {/* Old /docs paths redirect to /help. */}
                  <Route path="docs" element={<Navigate to="/help" replace />} />
                  <Route path="docs/:slug" element={<Navigate to="/help" replace />} />
                  <Route path="security" element={<SecurityPage />} />
                  {/* Head-term landing page: "crypto kill switch", "killswitch app". */}
                  <Route path="crypto-kill-switch" element={<CryptoKillSwitchPage />} />
                  <Route path="roadmap" element={<RoadmapPage />} />
                  {/* Catch-all 404 inside Layout so the page keeps nav + footer.
                      Replaces the previous redirect-to-home that produced soft-404s. */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route path="dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  {/* Preserve the query string — signup lands on /dashboard?welcome=1
                      and a bare Navigate would drop it, so the welcome never fired. */}
                  <Route index element={<RedirectWithSearch to="/dashboard/overview" />} />
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="live" element={<LiveGuardPage />} />
                  <Route path="rules" element={<RulesTerminal />} />
                  <Route path="journal" element={<JournalPage />} />
                  <Route path="calendar" element={<EconomicCalendarPage />} />
                  <Route path="trades" element={<AllTradesPage />} />
                  <Route path="tax" element={<TaxPage />} />
                  <Route path="trades/:tradeUid" element={<TradeDetailPage />} />
                  <Route path="account" element={<AccountLayout />}>
                    <Route index element={<AccountOverviewPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="trading" element={<AccountsPage />} />
                    <Route path="notifications" element={<RedirectWithSearch to="/dashboard/alerts" />} />
                    <Route path="security" element={<SecuritySettingsPage />} />
                  </Route>
                  <Route path="trading-accounts" element={<RedirectWithSearch to="/dashboard/account/trading" />} />
                  <Route path="billing" element={<RedirectWithSearch to="/dashboard/account/billing" />} />
                  <Route path="connect" element={<ConnectKeyPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="preferences" element={<PreferencesPage />} />
                  {/* Extension-era routes: the product is server-side only now. */}
                  <Route path="install-extension" element={<RedirectWithSearch to="/dashboard/account/trading" />} />
                  <Route path="pairing" element={<RedirectWithSearch to="/dashboard/connect" />} />
                </Route>
                <Route path="influencer" element={<ProtectedRoute><InfluencerLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/influencer/overview" replace />} />
                  <Route path="overview" element={<InfluencerOverview />} />
                  <Route path="commissions" element={<InfluencerCommissions />} />
                  <Route path="payouts" element={<InfluencerPayouts />} />
                </Route>
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
