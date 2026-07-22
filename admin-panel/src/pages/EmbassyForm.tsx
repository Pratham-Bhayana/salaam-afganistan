import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  createEmbassy,
  getEmbassy,
  listVisaTypesForPicker,
  resetEmbassyPassword,
  updateEmbassy,
  type CreateEmbassyInput,
  type Embassy,
  type VisaTypeOption,
} from '../api/embassies';
import { ApiError } from '../api/client';
import { Modal } from '../components/Modal';
import '../components/Modal.css';
import './EmbassyForm.css';

type Mode = 'create' | 'edit';

type FormState = {
  code: string;
  name: string;
  isActive: boolean;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  jurisdictionCountries: string[];
  supportedVisaTypeCodes: string[];
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  notes: string;
};

type FieldErrors = Partial<Record<'code' | 'name' | 'email', string>>;

const EMPTY: FormState = {
  code: '',
  name: '',
  isActive: true,
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  jurisdictionCountries: [],
  supportedVisaTypeCodes: [],
  logoUrl: '',
  primaryColor: '#0B3D2E',
  secondaryColor: '#C4A35A',
  notes: '',
};

function fromEmbassy(embassy: Embassy): FormState {
  return {
    code: embassy.code || '',
    name: embassy.name || '',
    isActive: embassy.isActive !== false,
    email: embassy.contact?.email || '',
    phone: embassy.contact?.phone || '',
    address: embassy.contact?.address || '',
    city: embassy.contact?.city || '',
    country: embassy.contact?.country || '',
    jurisdictionCountries: [...(embassy.jurisdictionCountries || [])],
    supportedVisaTypeCodes: [...(embassy.supportedVisaTypeCodes || [])],
    logoUrl: embassy.logoUrl || '',
    primaryColor: embassy.branding?.primaryColor || '#0B3D2E',
    secondaryColor: embassy.branding?.secondaryColor || '#C4A35A',
    notes: embassy.notes || '',
  };
}

function validate(form: FormState, mode: Mode): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === 'create' && !form.code.trim()) errors.code = 'Code is required';
  if (!form.name.trim()) errors.name = 'Name is required';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email';
  }
  return errors;
}

function buildPayload(form: FormState, mode: Mode): CreateEmbassyInput | Omit<CreateEmbassyInput, 'code'> {
  const base = {
    name: form.name.trim(),
    logoUrl: form.logoUrl.trim() || undefined,
    branding: {
      primaryColor: form.primaryColor || undefined,
      secondaryColor: form.secondaryColor || undefined,
    },
    contact: {
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim().toUpperCase() || undefined,
    },
    jurisdictionCountries: form.jurisdictionCountries,
    supportedVisaTypeCodes: form.supportedVisaTypeCodes,
    isActive: form.isActive,
    notes: form.notes.trim() || undefined,
  };
  if (mode === 'create') {
    return { ...base, code: form.code.trim().toUpperCase() };
  }
  return base;
}

export function EmbassyForm({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [visaTypes, setVisaTypes] = useState<VisaTypeOption[]>([]);
  const [countryDraft, setCountryDraft] = useState('');
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirmValue, setResetConfirmValue] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await listVisaTypesForPicker('embassy');
        if (!cancelled) setVisaTypes(data);
      } catch {
        if (!cancelled) setVisaTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { data } = await getEmbassy(id);
        if (!cancelled) {
          setForm(fromEmbassy(data.embassy));
          setBrandingOpen(Boolean(data.embassy.logoUrl || data.embassy.branding));
          setApiError('');
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof ApiError ? err.message : 'Failed to load embassy');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addCountry() {
    const code = countryDraft.trim().toUpperCase();
    if (!code) return;
    if (form.jurisdictionCountries.includes(code)) {
      setCountryDraft('');
      return;
    }
    setField('jurisdictionCountries', [...form.jurisdictionCountries, code]);
    setCountryDraft('');
  }

  function toggleVisa(code: string) {
    setField(
      'supportedVisaTypeCodes',
      form.supportedVisaTypeCodes.includes(code)
        ? form.supportedVisaTypeCodes.filter((c) => c !== code)
        : [...form.supportedVisaTypeCodes, code]
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validate(form, mode);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setApiError('');
    try {
      if (mode === 'create') {
        const { data } = await createEmbassy(buildPayload(form, 'create') as CreateEmbassyInput);
        navigate(`/embassies/${data._id}`, { replace: true });
        return;
      }
      if (!id) return;
      await updateEmbassy(id, buildPayload(form, 'edit'));
      navigate(`/embassies/${id}`, { replace: true });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openResetModal() {
    setResetError('');
    setResetPasswordValue('');
    setResetConfirmValue('');
    setShowResetPassword(false);
    setShowResetConfirm(false);
    setResetOpen(true);
  }

  function closeResetModal() {
    if (resetting) return;
    setResetOpen(false);
    setResetError('');
    setResetPasswordValue('');
    setResetConfirmValue('');
    setShowResetPassword(false);
    setShowResetConfirm(false);
  }

  async function onSubmitResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    const password = resetPasswordValue;
    const confirm = resetConfirmValue;
    if (password.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setResetError('Passwords do not match');
      return;
    }

    setResetting(true);
    setResetError('');
    try {
      await resetEmbassyPassword(id, password);
      setResetOpen(false);
      setResetPasswordValue('');
      setResetConfirmValue('');
      setShowResetPassword(false);
      setShowResetConfirm(false);
      setResetError('');
      setResetSuccess('Password updated successfully');
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="embassy-form">
        <p className="embassy-form__lead">Loading embassy…</p>
      </div>
    );
  }

  return (
    <>
    <form className="embassy-form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <nav className="embassy-form__crumbs" aria-label="Breadcrumb">
        <Link to="/embassies">Embassies</Link>
        <span aria-hidden>/</span>
        <span>{mode === 'create' ? 'New' : form.name || 'Edit'}</span>
      </nav>

      <h1 className="embassy-form__title">
        {mode === 'create' ? 'Create embassy' : 'Edit embassy'}
      </h1>
      <p className="embassy-form__lead">
        {mode === 'create'
          ? 'Set identity, contact, and coverage for consular routing.'
          : 'Update profile fields. Embassy code cannot be changed.'}
      </p>

      {apiError ? <div className="embassy-form__banner">{apiError}</div> : null}
      {resetSuccess ? (
        <div
          className="embassy-form__banner"
          style={{ background: 'rgba(11, 61, 46, 0.1)', color: 'var(--brand)' }}
        >
          {resetSuccess}
        </div>
      ) : null}

      <section className="embassy-form__section">
        <h2>Identity</h2>
        <div className="embassy-form__grid">
          <label className="embassy-form__field">
            Code
            <input
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toUpperCase())}
              placeholder="e.g. DXB"
              disabled={mode === 'edit'}
              maxLength={12}
              required={mode === 'create'}
              autoFocus={mode === 'create'}
            />
            <span className="embassy-form__hint">Short unique code (uppercase)</span>
            {fieldErrors.code ? <span className="embassy-form__error">{fieldErrors.code}</span> : null}
          </label>
          <label className="embassy-form__field">
            Name
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Dubai Consulate"
              required
              autoFocus={mode === 'edit'}
            />
            {fieldErrors.name ? <span className="embassy-form__error">{fieldErrors.name}</span> : null}
          </label>
          <label className="embassy-form__toggle">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            Active embassy
          </label>
        </div>
      </section>

      <section className="embassy-form__section">
        <h2>Contact</h2>
        <div className="embassy-form__grid">
          <label className="embassy-form__field">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="dubai@mfa.local"
            />
            {fieldErrors.email ? <span className="embassy-form__error">{fieldErrors.email}</span> : null}
          </label>
          <label className="embassy-form__field">
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+971…"
            />
          </label>
          <label className="embassy-form__field">
            City
            <input
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="Dubai"
            />
          </label>
          <label className="embassy-form__field">
            Country
            <input
              value={form.country}
              onChange={(e) => setField('country', e.target.value.toUpperCase())}
              placeholder="AE"
              maxLength={3}
            />
            <span className="embassy-form__hint">ISO country code</span>
          </label>
          <label className="embassy-form__field embassy-form__field--full">
            Address
            <textarea
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Street, building…"
            />
          </label>
        </div>
      </section>

      <section className="embassy-form__section">
        <h2>Coverage</h2>
        <p>Jurisdiction countries and supported embassy visa types.</p>

        <div className="embassy-form__field">
          Jurisdiction countries
          <div className="embassy-form__tag-row">
            <input
              value={countryDraft}
              onChange={(e) => setCountryDraft(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCountry();
                }
              }}
              placeholder="Add ISO code (e.g. AE)"
              maxLength={3}
            />
            <button type="button" onClick={addCountry}>
              Add
            </button>
          </div>
          <div className="embassy-form__tags">
            {form.jurisdictionCountries.map((code) => (
              <span key={code} className="embassy-form__tag">
                {code}
                <button
                  type="button"
                  aria-label={`Remove ${code}`}
                  onClick={() =>
                    setField(
                      'jurisdictionCountries',
                      form.jurisdictionCountries.filter((c) => c !== code)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="embassy-form__field">
          Supported visa types
          {visaTypes.length === 0 ? (
            <span className="embassy-form__hint">No embassy visa types available yet.</span>
          ) : (
            <div className="embassy-form__chips">
              {visaTypes.map((vt) => {
                const selected = form.supportedVisaTypeCodes.includes(vt.code);
                return (
                  <button
                    key={vt._id || vt.code}
                    type="button"
                    className={`embassy-form__chip${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleVisa(vt.code)}
                  >
                    {vt.name} ({vt.code})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="embassy-form__section">
        <button
          type="button"
          className="embassy-form__collapse"
          onClick={() => setBrandingOpen((v) => !v)}
          aria-expanded={brandingOpen}
        >
          {brandingOpen ? 'Hide branding' : 'Show branding (optional)'}
        </button>
        {brandingOpen ? (
          <>
            <label className="embassy-form__field">
              Logo URL
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setField('logoUrl', e.target.value)}
                placeholder="https://…"
              />
            </label>
            <div className="embassy-form__colors">
              <label className="embassy-form__field">
                Primary color
                <span className="embassy-form__color">
                  <input
                    type="color"
                    value={form.primaryColor || '#0B3D2E'}
                    onChange={(e) => setField('primaryColor', e.target.value)}
                  />
                  <input
                    value={form.primaryColor}
                    onChange={(e) => setField('primaryColor', e.target.value)}
                  />
                </span>
              </label>
              <label className="embassy-form__field">
                Secondary color
                <span className="embassy-form__color">
                  <input
                    type="color"
                    value={form.secondaryColor || '#C4A35A'}
                    onChange={(e) => setField('secondaryColor', e.target.value)}
                  />
                  <input
                    value={form.secondaryColor}
                    onChange={(e) => setField('secondaryColor', e.target.value)}
                  />
                </span>
              </label>
            </div>
          </>
        ) : null}
      </section>

      <section className="embassy-form__section">
        <h2>Notes</h2>
        <label className="embassy-form__field">
          Internal notes
          <textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Optional operator notes…"
          />
        </label>
      </section>

      <div className="embassy-form__actions">
        <Link to={mode === 'edit' && id ? `/embassies/${id}` : '/embassies'} className="is-ghost">
          Cancel
        </Link>
        <button type="submit" className="is-primary" disabled={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create embassy' : 'Save changes'}
        </button>
      </div>

      {mode === 'edit' ? (
        <section
          aria-labelledby="embassy-security-heading"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 8,
            padding: 16,
            border: '1px solid rgba(179, 58, 58, 0.22)',
            borderRadius: 12,
            background: 'rgba(179, 58, 58, 0.05)',
          }}
        >
          <h2 id="embassy-security-heading" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#8f2a2a' }}>
            Security
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
            Set a new login password for this embassy admin account.
          </p>
          <button
            type="button"
            onClick={() => {
              setResetSuccess('');
              openResetModal();
            }}
            style={{
              alignSelf: 'flex-start',
              height: 38,
              padding: '0 14px',
              borderRadius: 10,
              border: '1px solid rgba(179, 58, 58, 0.35)',
              background: '#fff',
              color: '#b33a3a',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Password
          </button>
        </section>
      ) : null}
    </form>

    <Modal open={resetOpen} title="Reset password" onClose={closeResetModal}>
      <form className="modal-form" onSubmit={(e) => void onSubmitResetPassword(e)}>
        {resetError ? <div className="modal-form__error">{resetError}</div> : null}
        <label>
          New Password
          <div style={{ position: 'relative' }}>
            <input
              type={showResetPassword ? 'text' : 'password'}
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
              style={{ paddingRight: 48, width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowResetPassword((v) => !v)}
              aria-label={showResetPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 10,
                transform: 'translateY(-50%)',
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                border: 'none',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label>
          Confirm Password
          <div style={{ position: 'relative' }}>
            <input
              type={showResetConfirm ? 'text' : 'password'}
              value={resetConfirmValue}
              onChange={(e) => setResetConfirmValue(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              style={{ paddingRight: 48, width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowResetConfirm((v) => !v)}
              aria-label={showResetConfirm ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 10,
                transform: 'translateY(-50%)',
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                border: 'none',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
              }}
            >
              {showResetConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <div className="modal-form__actions">
          <button type="button" className="is-ghost" disabled={resetting} onClick={closeResetModal}>
            Cancel
          </button>
          <button type="submit" className="is-danger" disabled={resetting}>
            {resetting ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
    </>
  );
}
