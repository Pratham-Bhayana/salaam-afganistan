"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "@/app/login/login.module.css";

function LoadingSpinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} aria-label="Loading" role="status" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname || "/apply");
      router.push(`/login?redirect=${redirect}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) return null;

  return <>{children}</>;
}
