import { authLog } from './authLogger';

const AUTH_LOCK_KEY = 'campaignhub.auth.lock';
const LAST_PROVIDER_KEY = 'campaignhub.auth.lastProvider';

/** Prevent duplicate simultaneous auth requests (double-clicks, StrictMode). */
export function acquireAuthLock(action, ttlMs = 45000) {
  if (typeof window === 'undefined') return true;
  try {
    const raw = sessionStorage.getItem(AUTH_LOCK_KEY);
    if (raw) {
      const { action: locked, until } = JSON.parse(raw);
      if (Date.now() < until) {
        authLog.session('Auth lock active', { locked, action });
        return false;
      }
    }
    sessionStorage.setItem(
      AUTH_LOCK_KEY,
      JSON.stringify({ action, until: Date.now() + ttlMs })
    );
    return true;
  } catch {
    return true;
  }
}

export function releaseAuthLock() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

export function rememberAuthProvider(provider) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_PROVIDER_KEY, provider);
  } catch {
    /* ignore */
  }
}

export function getLastAuthProvider() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_PROVIDER_KEY);
  } catch {
    return null;
  }
}

export function withAuthTimeout(promise, ms = 45000, label = 'Auth') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), ms);
    }),
  ]);
}
