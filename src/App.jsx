import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SupportPage from './pages/SupportPage';
import BetaTestRegistrationPage from './pages/BetaTestRegistrationPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import TradeOverviewPage from './pages/TradeOverviewPage';
import RulesTerminal from './components/dashboard/RulesTerminal';
import TradeJournal from './components/dashboard/TradeJournal';
import AllTradesPage from './pages/AllTradesPage';
import TradeDetailPage from './pages/TradeDetailPage';
import TradingAccountsPage from './pages/TradingAccountsPage';
import AccountLayout from './pages/AccountLayout';
import AccountOverviewPage from './pages/AccountOverviewPage';
import RedirectWithSearch from './pages/RedirectWithSearch';
import InstallExtensionPage from './pages/InstallExtensionPage';
import BillingPage from './pages/BillingPage';
import PairingPage from './pages/PairingPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import AppLoader from './components/common/AppLoader';
import CommandMenu from './components/common/CommandMenu';
import { ToastProvider } from './components/common/ToastProvider';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import VercelRouteAnalytics from './components/common/VercelRouteAnalytics';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <AppLoader />;
  }

  return (
    <AppErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <VercelRouteAnalytics />
              <ScrollToTop />
              <CommandMenu />
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="signup" element={<SignupPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="beta-traders" element={<BetaTestRegistrationPage />} />
                  <Route path="beta-testers" element={<Navigate to="/beta-traders" replace />} />
                  <Route path="privacy" element={<PrivacyPolicyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="refund" element={<RefundPolicyPage />} />
                </Route>
                <Route path="dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard/overview" replace />} />
                  <Route path="overview" element={<TradeOverviewPage />} />
                  <Route path="rules" element={<RulesTerminal />} />
                  <Route path="journal" element={<TradeJournal />} />
                  <Route path="trades" element={<AllTradesPage />} />
                  <Route path="trades/:tradeUid" element={<TradeDetailPage />} />
                  <Route path="account" element={<AccountLayout />}>
                    <Route index element={<AccountOverviewPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="trading" element={<TradingAccountsPage />} />
                  </Route>
                  <Route path="trading-accounts" element={<RedirectWithSearch to="/dashboard/account/trading" />} />
                  <Route path="billing" element={<RedirectWithSearch to="/dashboard/account/billing" />} />
                  <Route path="install-extension" element={<InstallExtensionPage />} />
                  <Route path="pairing" element={<PairingPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
