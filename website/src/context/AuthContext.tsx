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

export interface AuthUser {
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "salaam_auth_user";
const USERS_KEY = "salaam_auth_users";
/** Demo password / OTP for frontend-only auth */
export const DEMO_PASSWORD = "123456";

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readUsers(): Record<string, { email: string; displayName: string; password: string }> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(
  users: Record<string, { email: string; displayName: string; password: string }>,
) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    await delay();
    const normalized = email.trim().toLowerCase();

    if (!normalized || !normalized.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    if (password !== DEMO_PASSWORD) {
      throw new Error(`Demo password / OTP must be ${DEMO_PASSWORD}.`);
    }

    const users = readUsers();
    if (users[normalized]) {
      throw new Error("This email is already registered. Try signing in instead.");
    }

    const displayName = fullName.trim() || normalized.split("@")[0];
    users[normalized] = { email: normalized, displayName, password: DEMO_PASSWORD };
    writeUsers(users);

    const nextUser = { email: normalized, displayName };
    writeSession(nextUser);
    setUser(nextUser);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await delay();
    const normalized = email.trim().toLowerCase();

    if (!normalized || !normalized.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    if (password !== DEMO_PASSWORD) {
      throw new Error(`Incorrect password. Use ${DEMO_PASSWORD} for demo login.`);
    }

    const users = readUsers();
    const existing = users[normalized];

    const nextUser: AuthUser = existing
      ? { email: existing.email, displayName: existing.displayName }
      : { email: normalized, displayName: normalized.split("@")[0] };

    if (!existing) {
      users[normalized] = { ...nextUser, password: DEMO_PASSWORD };
      writeUsers(users);
    }

    writeSession(nextUser);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    await delay(150);
    writeSession(null);
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await delay();
    const nextUser: AuthUser = {
      email: "demo.google@salaam.local",
      displayName: "Google Demo User",
    };
    writeSession(nextUser);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signOut,
      signInWithGoogle,
    }),
    [user, loading, signUp, signIn, signOut, signInWithGoogle],
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
