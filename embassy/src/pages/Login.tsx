import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Building2, ShieldCheck, Globe2 } from 'lucide-react';
import { useAuth } from '../api/AuthContext';
import { ApiError } from '../api/client';
import './Login.css';

export function Login() {
  const { authenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero" aria-label="Brand">
        <div className="login-hero__wash login-hero__wash--purple" aria-hidden />
        <div className="login-hero__wash login-hero__wash--yellow" aria-hidden />
        <div className="login-hero__grid" aria-hidden />

        <div className="login-hero__content">
          <div className="login-hero__logos">
            <img src="/logo.png" alt="Salaam Afghanistan" className="login-hero__logo login-hero__logo--brand" />
            <span className="login-hero__logo-divider" aria-hidden />
            <img
              src="/moic.png"
              alt="Ministry of Information and Culture"
              className="login-hero__logo"
            />
            <span className="login-hero__logo-divider" aria-hidden />
            <img
              src="/Flag-Afghanistan.webp"
              alt="Afghanistan"
              className="login-hero__logo login-hero__logo--flag"
            />
          </div>
          <p className="login-hero__mark">Embassy Panel</p>
          <h1 className="login-hero__brand">
            Salaam
            <span>Afghanistan</span>
          </h1>
          <p className="login-hero__tagline">
            Review routed applications, decide cases, and coordinate with Raizing Global — scoped to
            your mission only.
          </p>

          <ul className="login-hero__points">
            <li>
              <Building2 size={18} strokeWidth={2} aria-hidden />
              Embassy-scoped inbox and case decisions
            </li>
            <li>
              <ShieldCheck size={18} strokeWidth={2} aria-hidden />
              Secure staff access with role permissions
            </li>
            <li>
              <Globe2 size={18} strokeWidth={2} aria-hidden />
              Chat and activity logs for your post
            </li>
          </ul>
        </div>

        <footer className="login-hero__footer">
          <span>Consular workspace</span>
          <span>Dubai · DXB</span>
        </footer>
      </section>

      <section className="login-panel">
        <div className="login-panel__inner">
          <header className="login-panel__header">
            <p className="login-panel__eyebrow">Welcome back</p>
            <h2>Sign in to embassy</h2>
            <p className="login-panel__lead">
              Use your embassy staff credentials to open the Salaam Afghanistan embassy workspace.
            </p>
          </header>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            {error ? (
              <div className="login-form__error" role="alert">
                {error}
              </div>
            ) : null}

            <label className="login-form__field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="username"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="login-form__field">
              <span>Password</span>
              <div className="login-form__password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-form__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="login-form__meta">
              <label className="login-form__remember">
                <input type="checkbox" />
                <span>Keep me signed in</span>
              </label>
              <button type="button" className="login-form__forgot">
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-form__submit" disabled={loading}>
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              {!loading ? <ArrowRight size={18} strokeWidth={2.25} aria-hidden /> : null}
            </button>
          </form>

          <p className="login-panel__footnote">
            Authorized embassy staff only. Admin panel credentials will not work here.
          </p>
        </div>
      </section>
    </div>
  );
}
