import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import AIChatWidget from './components/AIChatWidget';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import UploadCampaign from './pages/UploadCampaign';
import CampaignDetails, { LegacyCampaignRedirect } from './pages/CampaignDetails';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotificationsPage from './pages/NotificationsPage';
import CampaignPerformance from './pages/CampaignPerformance';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign/:slug" element={<CampaignDetails />} />
          <Route path="/campaigns/:slug" element={<LegacyCampaignRedirect />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/campaign/:slug/performance" element={<ProtectedRoute><CampaignPerformance /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute requireVerified><UploadCampaign /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
      <MobileNav />
      <AIChatWidget />
    </div>
  );
}

export default App;
