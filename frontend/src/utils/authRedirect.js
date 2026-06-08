const RETURN_PATH_KEY = 'campaignhub.auth.returnTo';

/** Persist intended destination before OAuth redirect (survives full page reload). */
export function saveAuthReturnPath(path = '/dashboard') {
  if (typeof window === 'undefined') return;
  const safe =
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';
  sessionStorage.setItem(RETURN_PATH_KEY, safe);
}

/** Read and clear saved return path after successful sign-in. */
export function consumeAuthReturnPath(fallback = '/dashboard') {
  if (typeof window === 'undefined') return fallback;
  const saved = sessionStorage.getItem(RETURN_PATH_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
  if (saved && saved.startsWith('/') && !saved.startsWith('//')) return saved;
  return fallback;
}

export function peekAuthReturnPath(fallback = '/dashboard') {
  if (typeof window === 'undefined') return fallback;
  const saved = sessionStorage.getItem(RETURN_PATH_KEY);
  if (saved && saved.startsWith('/') && !saved.startsWith('//')) return saved;
  return fallback;
}
