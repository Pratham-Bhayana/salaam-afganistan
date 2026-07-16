"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "../login/login.module.css";

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function SignupClient() {
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await signUp(email.trim(), password, fullName.trim());
      router.push("/apply");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setGoogleSubmitting(true);

    try {
      await signInWithGoogle();
      router.push("/apply");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className={styles.spinnerWrap}>
        <div className={styles.spinner} aria-label="Loading" role="status" />
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Salaam Afghanistan" className={styles.logo} />

        <h1 className={styles.heading}>Create Account</h1>
        <p className={styles.subtitle}>Sign up to start your visa application</p>
        <p className={styles.forgotText}>Demo password / OTP: 123456</p>

        {error ? <p className={styles.formError}>{error}</p> : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="signup-name" className={styles.fieldLabel}>
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your full name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-email" className={styles.fieldLabel}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password" className={styles.fieldLabel}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="123456"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-confirm-password" className={styles.fieldLabel}>
              Confirm Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="123456"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-full ${styles.submitBtn}`}
            disabled={submitting || googleSubmitting}
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <button
          type="button"
          className={`btn btn-outline btn-full ${styles.googleBtn}`}
          onClick={handleGoogleSignUp}
          disabled={submitting || googleSubmitting}
        >
          <GoogleIcon />
          {googleSubmitting ? "Signing up…" : "Sign up with Google"}
        </button>

        <p className={styles.linkText}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
