import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      // CRITICAL: getRedirectResult first — no setPersistence before this
      try {
        const redirectResult = await handleGoogleRedirectResult();
        if (mounted && redirectResult?.user) {
          setUser(redirectResult.user);
          if (redirectResult.profile) {
            setUserProfile(redirectResult.profile);
          }
        }
      } catch (err) {
        if (mounted) {
          toast(err.message || 'Google sign-in failed. Please try again.', 'error');
        }
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;
        setUser(firebaseUser);
        if (firebaseUser) {
          await loadProfile(firebaseUser);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
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
        /* user can retry manually */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.uid, user?.emailVerified, userProfile, loadProfile]);

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
    loading,
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
