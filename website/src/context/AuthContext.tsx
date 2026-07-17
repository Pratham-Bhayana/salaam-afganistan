"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { exchangeFirebaseToken, logoutWebsiteSession } from "@/lib/websiteApi";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  firebaseReady: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function mapUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    photoURL: user.photoURL,
  };
}

function authErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof Error)) return fallback;
  const code = "code" in err ? String((err as { code?: string }).code || "") : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Allow pop-ups for this site and try again.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled in Firebase Console.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Console (Authentication → Settings → Authorized domains).";
    default:
      return err.message || fallback;
  }
}

async function syncBackendSession(user: User, displayName?: string) {
  const idToken = await user.getIdToken();
  const name = displayName || user.displayName || undefined;
  const parts = name?.trim().split(/\s+/).filter(Boolean) || [];

  await exchangeFirebaseToken(idToken, {
    displayName: name,
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapUser(firebaseUser));
        // Refresh backend JWT when session restores
        void syncBackendSession(firebaseUser).catch(() => undefined);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseReady]);

  const requireFirebase = useCallback(() => {
    if (!firebaseReady) {
      throw new Error(
        "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys to website/.env",
      );
    }
    return getFirebaseAuth();
  }, [firebaseReady]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const auth = requireFirebase();
        const normalized = email.trim().toLowerCase();
        const displayName = fullName.trim() || normalized.split("@")[0];

        const cred = await createUserWithEmailAndPassword(auth, normalized, password);
        await updateProfile(cred.user, { displayName });
        await syncBackendSession(cred.user, displayName);
        setUser(mapUser(cred.user));
      } catch (err) {
        throw new Error(authErrorMessage(err, "Sign up failed. Please try again."));
      }
    },
    [requireFirebase],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const auth = requireFirebase();
        const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await syncBackendSession(cred.user);
        setUser(mapUser(cred.user));
      } catch (err) {
        throw new Error(authErrorMessage(err, "Sign in failed. Please try again."));
      }
    },
    [requireFirebase],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const auth = requireFirebase();
      const cred = await signInWithPopup(auth, googleProvider);
      await syncBackendSession(cred.user);
      setUser(mapUser(cred.user));
    } catch (err) {
      throw new Error(authErrorMessage(err, "Google sign-in failed. Please try again."));
    }
  }, [requireFirebase]);

  const signOut = useCallback(async () => {
    try {
      if (firebaseReady) {
        await firebaseSignOut(getFirebaseAuth());
      }
    } finally {
      await logoutWebsiteSession();
      setUser(null);
    }
  }, [firebaseReady]);

  const getIdToken = useCallback(async () => {
    if (!firebaseReady) return null;
    const current = getFirebaseAuth().currentUser;
    if (!current) return null;
    return current.getIdToken();
  }, [firebaseReady]);

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseReady,
      signUp,
      signIn,
      signOut,
      signInWithGoogle,
      getIdToken,
    }),
    [user, loading, firebaseReady, signUp, signIn, signOut, signInWithGoogle, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
