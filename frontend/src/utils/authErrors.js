/** Firebase Authentication error messages for production UX */
export function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/popup-blocked': 'Sign-in popup was blocked. Redirecting…',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email using a different sign-in method.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/unauthorized-domain':
      'This website is not authorized for sign-in. Contact support or try again from www.campaignhubgh.com.',
    'auth/internal-error': 'Sign-in failed. Please refresh the page and try again.',
    'auth/web-storage-unsupported':
      'Your browser blocked sign-in storage. Enable cookies or try a different browser.',
    'auth/timeout': 'Sign-in timed out. Please try again.',
  };
  return messages[code] || null;
}
