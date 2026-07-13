import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../api/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const location = useLocation();

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
