import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isAdmin as checkIsAdmin } from '../firebase/auth';
import {
  getUserProfile,
  logout as authLogout,
  refreshAuthUser,
  handleGoogleRedirectResult,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectProcessing, setRedirectProcessing] = useState(true);

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return;
    }
    const profile = await getUserProfile(firebaseUser.uid);
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await handleGoogleRedirectResult();
      } catch (err) {
        console.error('Google redirect sign-in failed:', err.message);
      } finally {
        if (mounted) setRedirectProcessing(false);
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [loadProfile]);

  /** Auto-refresh verification status while user is pending verification */
  useEffect(() => {
    if (!user || user.emailVerified) return undefined;

    const interval = setInterval(async () => {
      try {
        const updated = await refreshAuthUser();
        if (updated?.emailVerified) {
          setUser(auth.currentUser);
          await loadProfile(updated);
        }
      } catch {
        /* silent — user may retry manually */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.uid, user?.emailVerified, loadProfile]);

  const logout = async () => {
    await authLogout();
    setUser(null);
    setUserProfile(null);
  };

  const refreshUser = async () => {
    const updated = await refreshAuthUser();
    if (updated) {
      setUser(auth.currentUser);
      await loadProfile(updated);
    }
    return updated;
  };

  const value = {
    user,
    userProfile,
    loading: loading || redirectProcessing,
    isAuthenticated: !!user,
    isAdmin: checkIsAdmin(user, userProfile),
    isVerified: user?.emailVerified ?? false,
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
