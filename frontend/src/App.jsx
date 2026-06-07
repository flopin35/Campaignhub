import { lazy, Suspense } from 'react';

import { Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';

import Footer from './components/Footer';

import MobileNav from './components/MobileNav';

import AIChatWidget from './components/AIChatWidget';

import ProtectedRoute from './components/ProtectedRoute';

import ProtectedVerifiedRoute from './components/ProtectedVerifiedRoute';

import GuestRoute from './components/GuestRoute';

import CampaignSkeleton from './components/CampaignSkeleton';



const Home = lazy(() => import('./pages/Home'));

const Campaigns = lazy(() => import('./pages/Campaigns'));

const UploadCampaign = lazy(() => import('./pages/UploadCampaign'));

const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));

const LegacyCampaignRedirect = lazy(() =>

  import('./pages/CampaignDetails').then((m) => ({ default: m.LegacyCampaignRedirect }))

);

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const Settings = lazy(() => import('./pages/Settings'));

const Login = lazy(() => import('./pages/Login'));

const Signup = lazy(() => import('./pages/Signup'));

const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

const VerifyEmailPage = lazy(() =>

  import('./components/VerifyEmailNotice').then((m) => ({ default: m.VerifyEmailPage }))

);

const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const CampaignPerformance = lazy(() => import('./pages/CampaignPerformance'));

const Dashboard = lazy(() => import('./pages/Dashboard'));

const Premium = lazy(() => import('./pages/Premium'));
const Support = lazy(() => import('./pages/Support'));



function PageLoader() {

  return (

    <div className="max-w-7xl mx-auto px-4 py-16">

      <CampaignSkeleton />

    </div>

  );

}



function App() {

  return (

    <div className="flex flex-col min-h-screen">

      <Navbar />

      <main className="flex-1 pb-20 md:pb-0">

        <Suspense fallback={<PageLoader />}>

          <Routes>

            <Route path="/" element={<Home />} />

            <Route path="/campaigns" element={<Campaigns />} />

            <Route path="/campaign/:slug" element={<CampaignDetails />} />

            <Route path="/campaigns/:slug" element={<LegacyCampaignRedirect />} />

            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

            <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

            <Route path="/verify-email" element={<VerifyEmailPage />} />



            <Route path="/premium" element={<Premium />} />
            <Route path="/support" element={<Support />} />

            <Route path="/dashboard" element={<ProtectedVerifiedRoute><Dashboard /></ProtectedVerifiedRoute>} />

            <Route path="/upload" element={<ProtectedVerifiedRoute><UploadCampaign /></ProtectedVerifiedRoute>} />

            <Route path="/notifications" element={<ProtectedVerifiedRoute><NotificationsPage /></ProtectedVerifiedRoute>} />

            <Route path="/campaign/:slug/performance" element={<ProtectedVerifiedRoute><CampaignPerformance /></ProtectedVerifiedRoute>} />

            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

          </Routes>

        </Suspense>

      </main>

      <Footer />

      <MobileNav />

      <AIChatWidget />

    </div>

  );

}



export default App;

