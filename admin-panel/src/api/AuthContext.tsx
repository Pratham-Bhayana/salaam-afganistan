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
  getStoredStaff,
  isAuthenticated,
  loginAdmin,
  type StaffSession,
} from './client';

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
