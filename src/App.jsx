import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SupportPage from './pages/SupportPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import TradeOverviewPage from './pages/TradeOverviewPage';
import RulesTerminal from './components/dashboard/RulesTerminal';
import TradeJournal from './components/dashboard/TradeJournal';
import AllTradesPage from './pages/AllTradesPage';
import InstallExtensionPage from './pages/InstallExtensionPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="support" element={<SupportPage />} />
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
            <Route path="install-extension" element={<InstallExtensionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
