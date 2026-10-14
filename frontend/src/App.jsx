import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import EmailVerificationHandler from './components/EmailVerificationHandler';
import ProtectedVerifiedRoute from './components/ProtectedVerifiedRoute';
import GuestRoute from './components/GuestRoute';
import AdminAccessDenied from './components/AdminAccessDenied';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import { PageLoader } from './components/ui';
import { useAuth } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));
const Pricing = lazy(() => import('./pages/Premium'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const LegacyCampaignRedirect = lazy(() => import('./pages/CampaignDetails').then((m) => ({ default: m.LegacyCampaignRedirect })));
const About = lazy(() => import('./pages/About'));
const Support = lazy(() => import('./pages/Support'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmailPage = lazy(() => import('./components/VerifyEmailNotice').then((m) => ({ default: m.VerifyEmailPage })));
const FieldPortal = lazy(() => import('./pages/FieldPortal'));
const BillingCallback = lazy(() => import('./pages/BillingCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewCampaign = lazy(() => import('./pages/UploadCampaign'));
const WorkspacePage = lazy(() => import('./pages/workspace/WorkspacePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <AdminAccessDenied />;
}

function LegacyDashboardRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/dashboard?campaign=${slug}` : '/dashboard'} replace />;
}

/** Every new page starts at the top (dashboard sections, candidate pages, field links). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <EmailVerificationHandler>
      <ScrollToTop />
      <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/premium" element={<Navigate to="/pricing" replace />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/refunds" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/campaign/:slug" element={<CampaignDetails />} />
          <Route path="/campaigns/:slug" element={<LegacyCampaignRedirect />} />
          <Route path="/campaign/:slug/performance" element={<LegacyDashboardRedirect />} />
          <Route path="/campaign/:slug/command" element={<LegacyDashboardRedirect />} />
          <Route path="/field/:token" element={<FieldPortal />} />
          <Route path="/billing/callback" element={<BillingCallback />} />

          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/upload" element={<Navigate to="/dashboard/new" replace />} />

          <Route element={<ProtectedVerifiedRoute><AppLayout /></ProtectedVerifiedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/new" element={<NewCampaign />} />
            <Route path="/dashboard/:campaignId" element={<WorkspacePage />} />
            <Route path="/dashboard/:campaignId/:section" element={<WorkspacePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </EmailVerificationHandler>
  );
}
