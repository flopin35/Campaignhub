import axios from 'axios';
import { auth } from '../firebase/auth';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 28000,
});

// Attach Firebase ID token to API requests
api.interceptors.request.use(async (config) => {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const token = await firebaseUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data || {};
    let message = data.message || error.message || 'Something went wrong';
    const isAuthCall = (error.config?.url || '').includes('/auth/');

    if (!error.response) {
      if (error.code === 'ECONNABORTED' || message.toLowerCase().includes('timeout')) {
        message = isAuthCall
          ? 'The sign-in server took too long to respond. Check your connection, then try again — or use Password / Google sign-in.'
          : 'The server took too long to respond. Check your connection and try again.';
      } else if (message === 'Network Error' || error.message === 'Network Error') {
        message = isAuthCall
          ? 'Could not reach the sign-in server. Check your connection or try Password / Google sign-in.'
          : 'Could not reach CampaignHub. Check your internet connection and try again.';
      }
    }

    const err = new Error(message);
    if (data.code) err.code = data.code;
    if (error.response?.status) err.status = error.response.status;
    if (!error.response) err.code = err.code || 'NETWORK_ERROR';
    return Promise.reject(err);
  }
);

export default api;
