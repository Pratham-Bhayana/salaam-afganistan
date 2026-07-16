import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "./LoginClient";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Salaam Afghanistan account to continue your visa application.",
};

function LoginFallback() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} aria-label="Loading" role="status" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
