import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  getStoredStaff,
  isAuthenticated,
  loginAdmin,
  type StaffSession,
} from './client';

const INACTIVITY_WARNING_MS = 55 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'click', 'keypress'] as const;

type AuthContextValue = {
  staff: StaffSession | null;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<StaffSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffSession | null>(() => getStoredStaff());
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginAdmin(email, password);
    setStaff(next);
    setAuthenticated(true);
    return next;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setStaff(null);
    setAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    let warningTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let logoutTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = () => {
      if (warningTimeoutId !== undefined) clearTimeout(warningTimeoutId);
      if (logoutTimeoutId !== undefined) clearTimeout(logoutTimeoutId);
      warningTimeoutId = undefined;
      logoutTimeoutId = undefined;
    };

    const startTimers = () => {
      clearTimers();
      warningTimeoutId = setTimeout(() => {
        window.alert('Session expiring in 5 minutes');
      }, INACTIVITY_WARNING_MS);
      logoutTimeoutId = setTimeout(() => {
        clearTimers();
        logout();
        window.location.href = '/login';
      }, INACTIVITY_TIMEOUT_MS);
    };

    const onActivity = () => {
      startTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity);
    }
    startTimers();

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [authenticated, logout]);

  const value = useMemo(
    () => ({ staff, authenticated, login, logout }),
    [staff, authenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
