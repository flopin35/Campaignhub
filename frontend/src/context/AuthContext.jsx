import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isAdmin as checkIsAdmin } from '../firebase/auth';
import {
  getUserProfile,
  logout as authLogout,
  refreshAuthUser,
  handleGoogleRedirectResult,
  saveUserToFirestore,
  isUserVerified,
} from '../services/authService';
import { useToast } from './ToastContext';
import { authLog } from '../utils/authLogger';
import { getLastAuthProvider } from '../utils/authSession';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPhase, setAuthPhase] = useState('initializing');

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return null;
    }
    let profile = await getUserProfile(firebaseUser.uid);
    if (!profile) {
      profile = await saveUserToFirestore(firebaseUser).catch(() => null);
    }
    setUserProfile(profile);
    return profile;
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    (async () => {
      setAuthPhase('redirect');
      authLog.info('Auth bootstrap start');

      try {
        const redirectResult = await handleGoogleRedirectResult();
        if (mounted && redirectResult?.user) {
          authLog.google('Redirect session restored', redirectResult.user.email);
          setUser(redirectResult.user);
          if (redirectResult.profile) setUserProfile(redirectResult.profile);
        }
      } catch (err) {
        if (mounted) {
          authLog.error('Redirect failed', err.message);
          toast(err.message || 'Google sign-in failed. Please try again.', 'error');
        }
      }

      if (mounted) setAuthPhase('restoring');

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;
        authLog.session('Auth state changed', firebaseUser?.email || 'signed out');
        setUser(firebaseUser);
        if (firebaseUser) {
          await loadProfile(firebaseUser);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
        setAuthPhase('ready');
      });
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [loadProfile, toast]);

  useEffect(() => {
    if (!user || isUserVerified(user, userProfile)) return undefined;

    const interval = setInterval(async () => {
      try {
        const updated = await refreshAuthUser();
        if (updated?.emailVerified) {
          setUser(auth.currentUser);
          await loadProfile(updated);
        }
      } catch {
        /* manual retry available */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.uid, user?.emailVerified, userProfile, loadProfile]);

  const logout = async () => {
    await authLogout();
    setUser(null);
    setUserProfile(null);
    setAuthPhase('ready');
  };

  const refreshUser = async () => {
    const updated = await refreshAuthUser();
    if (updated) {
      setUser(auth.currentUser);
      await loadProfile(updated);
    }
    return updated;
  };

  const loadingMessage = useMemo(() => {
    if (authPhase === 'redirect') return 'Redirecting safely…';
    if (authPhase === 'restoring') return 'Securing your session…';
    if (authPhase === 'initializing') return 'Loading…';
    return 'Restoring dashboard…';
  }, [authPhase]);

  const value = {
    user,
    userProfile,
    loading,
    authPhase,
    loadingMessage,
    lastAuthProvider: getLastAuthProvider(),
    isAuthenticated: !!user,
    isAdmin: checkIsAdmin(user, userProfile),
    isVerified: isUserVerified(user, userProfile),
    logout,
    refreshUser,
    setUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
