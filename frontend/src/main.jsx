import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { PremiumModalProvider } from './context/PremiumModalContext';
import { DashboardCampaignProvider } from './context/DashboardCampaignContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <PremiumModalProvider>
            <DashboardCampaignProvider>
              <App />
            </DashboardCampaignProvider>
          </PremiumModalProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
