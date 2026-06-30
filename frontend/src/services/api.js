import axios from 'axios';
import { auth } from '../firebase/auth';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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
    const message = data.message || error.message || 'Something went wrong';
    const err = new Error(message);
    if (data.code) err.code = data.code;
    return Promise.reject(err);
  }
);

export default api;
