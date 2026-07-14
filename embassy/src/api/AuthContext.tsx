import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  getStoredEmbassy,
  getStoredStaff,
  isAuthenticated,
  loginEmbassy,
  type EmbassyInfo,
  type EmbassyStaffSession,
} from './client';

type AuthContextValue = {
  staff: EmbassyStaffSession | null;
  embassy: EmbassyInfo | null;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<EmbassyStaffSession | null>(() => getStoredStaff());
  const [embassy, setEmbassy] = useState<EmbassyInfo | null>(() => getStoredEmbassy());
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginEmbassy(email, password);
    setStaff(next.staff);
    setEmbassy(next.embassy);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setStaff(null);
    setEmbassy(null);
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ staff, embassy, authenticated, login, logout }),
    [staff, embassy, authenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
