import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { staffHasPermission, ApiError } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { formatDate } from '../api/applications';
import {
  listEmailTemplates,
  upsertEmailTemplate,
  type EmailTemplate,
} from '../api/emailTemplates';
import {
  defaultBranding,
  defaultLocalization,
  defaultNotifications,
  defaultSecurity,
  defaultSystem,
  getSettings,
  updateSettings,
  type BrandingSettings,
  type LocalizationSettings,
  type NotificationSettings,
  type PlatformSettings,
  type SecuritySettings,
  type SettingsPatch,
  type SystemSettings,
} from '../api/settings';
import './Settings.css';

type TabId =
  | 'branding'
  | 'notifications'
  | 'localization'
  | 'security'
  | 'system'
  | 'email';

const TABS: { id: TabId; label: string }[] = [
  { id: 'branding', label: 'Branding' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'localization', label: 'Localization' },
  { id: 'security', label: 'Security' },
  { id: 'system', label: 'System' },
  { id: 'email', label: 'Email templates' },
];

function normalizeSettings(data: PlatformSettings) {
  return {
    branding: { ...defaultBranding(), ...data.branding },
    notifications: { ...defaultNotifications(), ...data.notifications },
    localization: {
      ...defaultLocalization(),
      ...data.localization,
      languages: [...(data.localization?.languages || defaultLocalization().languages || [])],
      currencies: [...(data.localization?.currencies || defaultLocalization().currencies || [])],
    },
    security: { ...defaultSecurity(), ...data.security },
    system: { ...defaultSystem(), ...data.system },
    updatedAt: data.updatedAt,
    updatedBy:
      typeof data.updatedBy === 'string'
        ? data.updatedBy
        : data.updatedBy?._id || '',
  };
}

function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function Settings() {
  const { staff } = useAuth();
  const canManage = staffHasPermission(staff, 'settings:manage');

  const [tab, setTab] = useState<TabId>('branding');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loaded, setLoaded] = useState<ReturnType<typeof normalizeSettings> | null>(null);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding());
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications());
  const [localization, setLocalization] = useState<LocalizationSettings>(defaultLocalization());
  const [security, setSecurity] = useState<SecuritySettings>(defaultSecurity());
  const [system, setSystem] = useState<SystemSettings>(defaultSystem());
  const [metaUpdatedAt, setMetaUpdatedAt] = useState<string | undefined>();
  const [metaUpdatedBy, setMetaUpdatedBy] = useState('');

  const [langDraft, setLangDraft] = useState('');
  const [currencyDraft, setCurrencyDraft] = useState('');

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [tplMode, setTplMode] = useState<'edit' | 'new'>('edit');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState({
    code: '',
    name: '',
    subject: '',
    htmlBody: '',
    textBody: '',
    placeholders: [] as string[],
    isActive: true,
  });
  const [placeholderDraft, setPlaceholderDraft] = useState('');
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState('');
  const [tplSuccess, setTplSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await getSettings();
      const next = normalizeSettings(data);
      setLoaded(next);
      setBranding(next.branding);
      setNotifications(next.notifications);
      setLocalization(next.localization);
      setSecurity(next.security);
      setSystem(next.system);
      setMetaUpdatedAt(next.updatedAt);
      setMetaUpdatedBy(next.updatedBy);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const loadTemplates = useCallback(async () => {
    if (!canManage) return;
    setTemplatesLoading(true);
    setTplError('');
    try {
      const { data } = await listEmailTemplates();
      setTemplates(data);
      setSelectedCode((current) => {
        if (current || tplMode === 'new' || !data.length) return current;
        const first = data[0];
        setTplForm({
          code: first.code,
          name: first.name,
          subject: first.subject,
          htmlBody: first.htmlBody,
          textBody: first.textBody || '',
          placeholders: [...(first.placeholders || [])],
          isActive: first.isActive !== false,
        });
        return first.code;
      });
    } catch (err) {
      setTplError(err instanceof ApiError ? err.message : 'Failed to load email templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, [canManage, tplMode]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (tab === 'email') void loadTemplates();
  }, [tab, loadTemplates]);

  function selectTemplate(tpl: EmailTemplate) {
    setTplMode('edit');
    setSelectedCode(tpl.code);
    setTplForm({
      code: tpl.code,
      name: tpl.name,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      textBody: tpl.textBody || '',
      placeholders: [...(tpl.placeholders || [])],
      isActive: tpl.isActive !== false,
    });
    setTplSuccess('');
    setTplError('');
  }

  function startNewTemplate() {
    setTplMode('new');
    setSelectedCode(null);
    setTplForm({
      code: '',
      name: '',
      subject: '',
      htmlBody: '',
      textBody: '',
      placeholders: [],
      isActive: true,
    });
    setTplSuccess('');
    setTplError('');
  }

  const dirtyPatch = useMemo(() => {
    if (!loaded) return null as SettingsPatch | null;
    const patch: SettingsPatch = {};
    if (!deepEqual(branding, loaded.branding)) patch.branding = branding;
    if (!deepEqual(notifications, loaded.notifications)) patch.notifications = notifications;
    if (!deepEqual(localization, loaded.localization)) patch.localization = localization;
    if (!deepEqual(security, loaded.security)) patch.security = security;
    if (!deepEqual(system, loaded.system)) patch.system = system;
    return Object.keys(patch).length ? patch : null;
  }, [loaded, branding, notifications, localization, security, system]);

  function resetForms() {
    if (!loaded) return;
    setBranding(loaded.branding);
    setNotifications(loaded.notifications);
    setLocalization(loaded.localization);
    setSecurity(loaded.security);
    setSystem(loaded.system);
    setSuccess('');
    setError('');
  }

  async function onSavePlatform() {
    if (!dirtyPatch) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await updateSettings(dirtyPatch);
      const next = normalizeSettings(data);
      setLoaded(next);
      setBranding(next.branding);
      setNotifications(next.notifications);
      setLocalization(next.localization);
      setSecurity(next.security);
      setSystem(next.system);
      setMetaUpdatedAt(next.updatedAt);
      setMetaUpdatedBy(next.updatedBy);
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function addChip(
    kind: 'languages' | 'currencies',
    draft: string,
    clear: () => void
  ) {
    const value = draft.trim();
    if (!value) return;
    setLocalization((prev) => {
      const list = [...(prev[kind] || [])];
      if (list.includes(value)) return prev;
      const next = { ...prev, [kind]: [...list, value] };
      if (kind === 'languages' && !next.defaultLanguage) next.defaultLanguage = value;
      if (kind === 'currencies' && !next.defaultCurrency) next.defaultCurrency = value;
      return next;
    });
    clear();
  }

  async function onSaveTemplate(e: FormEvent) {
    e.preventDefault();
    if (!tplForm.code.trim() || !tplForm.name.trim() || !tplForm.subject.trim() || !tplForm.htmlBody.trim()) {
      setTplError('Code, name, subject, and HTML body are required');
      return;
    }

    if (tplMode === 'new') {
      const exists = templates.some((t) => t.code === tplForm.code.trim());
      if (exists) {
        const ok = window.confirm(
          `A template with code "${tplForm.code.trim()}" already exists. Saving will overwrite it. Continue?`
        );
        if (!ok) return;
      }
    }

    setTplSaving(true);
    setTplError('');
    setTplSuccess('');
    try {
      const { data } = await upsertEmailTemplate({
        code: tplForm.code.trim(),
        name: tplForm.name.trim(),
        subject: tplForm.subject.trim(),
        htmlBody: tplForm.htmlBody,
        textBody: tplForm.textBody.trim() || undefined,
        placeholders: tplForm.placeholders,
        isActive: tplForm.isActive,
      });
      const { data: list } = await listEmailTemplates();
      setTemplates(list);
      selectTemplate(data);
      setTplSuccess('Template saved.');
    } catch (err) {
      setTplError(err instanceof ApiError ? err.message : 'Failed to save template');
    } finally {
      setTplSaving(false);
    }
  }

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  if (loading && !loaded) {
    return (
      <div className="settings">
        <header className="settings__header">
          <h1>Settings</h1>
          <p>Loading platform settings…</p>
        </header>
      </div>
    );
  }

  const showPlatformActions = tab !== 'email';

  return (
    <div className="settings">
      <header className="settings__header">
        <h1>Settings</h1>
        <p>Branding, notifications, system flags, and email templates</p>
      </header>

      <div className="settings__layout">
        <nav className="settings__nav" aria-label="Settings sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'is-active' : undefined}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings__panel">
          {showPlatformActions && error ? (
            <div className="settings__banner settings__banner--error">{error}</div>
          ) : null}
          {showPlatformActions && success ? (
            <div className="settings__banner settings__banner--success">
              {success}{' '}
              <Link to="/audit-logs?action=settings.update">View audit logs</Link>
            </div>
          ) : null}

          {tab === 'branding' ? (
            <section>
              <div className="settings__section-head">
                <h2>Branding</h2>
                <p>Platform identity used in admin UI and support/email displays.</p>
              </div>
              <div className="settings__grid">
                <label className="settings__field">
                  Platform name
                  <input
                    value={branding.platformName || ''}
                    onChange={(e) => setBranding({ ...branding, platformName: e.target.value })}
                  />
                </label>
                <label className="settings__field">
                  Support email
                  <input
                    type="email"
                    value={branding.supportEmail || ''}
                    onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                  />
                </label>
                <label className="settings__field">
                  Logo URL
                  <input
                    type="url"
                    value={branding.logoUrl || ''}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </label>
                <label className="settings__field">
                  Favicon URL
                  <input
                    type="url"
                    value={branding.faviconUrl || ''}
                    onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </label>
                <label className="settings__field">
                  Primary color
                  <span className="settings__color">
                    <input
                      type="color"
                      value={branding.primaryColor || '#0B3D2E'}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    />
                    <input
                      value={branding.primaryColor || ''}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    />
                  </span>
                </label>
                <label className="settings__field">
                  Secondary color
                  <span className="settings__color">
                    <input
                      type="color"
                      value={branding.secondaryColor || '#C4A35A'}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    />
                    <input
                      value={branding.secondaryColor || ''}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    />
                  </span>
                </label>
                <label className="settings__field settings__field--full">
                  Support phone
                  <input
                    value={branding.supportPhone || ''}
                    onChange={(e) => setBranding({ ...branding, supportPhone: e.target.value })}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {tab === 'notifications' ? (
            <section>
              <div className="settings__section-head">
                <h2>Notifications</h2>
                <p>Control email and in-app notification delivery from the platform.</p>
              </div>
              <div className="settings__toggles">
                <label className="settings__toggle">
                  <div>
                    <strong>Email notifications</strong>
                    <span>Master switch for outbound email.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.emailEnabled)}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailEnabled: e.target.checked })
                    }
                  />
                </label>
                <label className="settings__toggle">
                  <div>
                    <strong>In-app notifications</strong>
                    <span>Show activity alerts inside panels.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(notifications.inAppEnabled)}
                    onChange={(e) =>
                      setNotifications({ ...notifications, inAppEnabled: e.target.checked })
                    }
                  />
                </label>
                <label
                  className={`settings__toggle${notifications.emailEnabled ? '' : ' is-disabled'}`}
                >
                  <div>
                    <strong>Status change emails</strong>
                    <span>Notify applicants when application status changes.</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!notifications.emailEnabled}
                    checked={Boolean(notifications.statusChangeEmails)}
                    onChange={(e) =>
                      setNotifications({ ...notifications, statusChangeEmails: e.target.checked })
                    }
                  />
                </label>
                <label
                  className={`settings__toggle${notifications.emailEnabled ? '' : ' is-disabled'}`}
                >
                  <div>
                    <strong>Document request emails</strong>
                    <span>Notify applicants when documents are requested.</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!notifications.emailEnabled}
                    checked={Boolean(notifications.documentRequestEmails)}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        documentRequestEmails: e.target.checked,
                      })
                    }
                  />
                </label>
                <label
                  className={`settings__toggle${notifications.emailEnabled ? '' : ' is-disabled'}`}
                >
                  <div>
                    <strong>Visa issued emails</strong>
                    <span>Notify applicants when a visa PDF is issued.</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!notifications.emailEnabled}
                    checked={Boolean(notifications.visaIssuedEmails)}
                    onChange={(e) =>
                      setNotifications({ ...notifications, visaIssuedEmails: e.target.checked })
                    }
                  />
                </label>
              </div>
            </section>
          ) : null}

          {tab === 'localization' ? (
            <section>
              <div className="settings__section-head">
                <h2>Localization</h2>
                <p>Supported languages and currencies for applicant-facing flows.</p>
              </div>
              <div className="settings__grid">
                <div className="settings__field">
                  Languages
                  <div className="settings__tag-row">
                    <input
                      value={langDraft}
                      onChange={(e) => setLangDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addChip('languages', langDraft, () => setLangDraft(''));
                        }
                      }}
                      placeholder="e.g. en"
                    />
                    <button
                      type="button"
                      onClick={() => addChip('languages', langDraft, () => setLangDraft(''))}
                    >
                      Add
                    </button>
                  </div>
                  <div className="settings__chips">
                    {(localization.languages || []).map((code) => (
                      <span key={code} className="settings__chip">
                        {code}
                        <button
                          type="button"
                          aria-label={`Remove ${code}`}
                          onClick={() =>
                            setLocalization((prev) => {
                              const languages = (prev.languages || []).filter((c) => c !== code);
                              const defaultLanguage =
                                prev.defaultLanguage === code
                                  ? languages[0] || ''
                                  : prev.defaultLanguage;
                              return { ...prev, languages, defaultLanguage };
                            })
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <label className="settings__field">
                  Default language
                  <select
                    value={localization.defaultLanguage || ''}
                    onChange={(e) =>
                      setLocalization({ ...localization, defaultLanguage: e.target.value })
                    }
                  >
                    {(localization.languages || []).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="settings__field">
                  Currencies
                  <div className="settings__tag-row">
                    <input
                      value={currencyDraft}
                      onChange={(e) => setCurrencyDraft(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addChip('currencies', currencyDraft, () => setCurrencyDraft(''));
                        }
                      }}
                      placeholder="e.g. USD"
                    />
                    <button
                      type="button"
                      onClick={() => addChip('currencies', currencyDraft, () => setCurrencyDraft(''))}
                    >
                      Add
                    </button>
                  </div>
                  <div className="settings__chips">
                    {(localization.currencies || []).map((code) => (
                      <span key={code} className="settings__chip">
                        {code}
                        <button
                          type="button"
                          aria-label={`Remove ${code}`}
                          onClick={() =>
                            setLocalization((prev) => {
                              const currencies = (prev.currencies || []).filter((c) => c !== code);
                              const defaultCurrency =
                                prev.defaultCurrency === code
                                  ? currencies[0] || ''
                                  : prev.defaultCurrency;
                              return { ...prev, currencies, defaultCurrency };
                            })
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <label className="settings__field">
                  Default currency
                  <select
                    value={localization.defaultCurrency || ''}
                    onChange={(e) =>
                      setLocalization({ ...localization, defaultCurrency: e.target.value })
                    }
                  >
                    {(localization.currencies || []).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          {tab === 'security' ? (
            <section>
              <div className="settings__section-head">
                <h2>Security</h2>
                <p>
                  Persist security preferences. Session timeout and MFA may not be fully enforced in
                  the SPA yet.
                </p>
              </div>
              <div className="settings__grid">
                <label className="settings__field">
                  Session timeout (minutes)
                  <input
                    type="number"
                    min={5}
                    value={security.sessionTimeoutMinutes ?? 60}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        sessionTimeoutMinutes: Math.max(5, Number(e.target.value) || 5),
                      })
                    }
                  />
                  <span className="settings__hint">Minimum 5 minutes</span>
                </label>
                <label className="settings__field">
                  Max login attempts
                  <input
                    type="number"
                    min={1}
                    value={security.maxLoginAttempts ?? 5}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        maxLoginAttempts: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
              </div>
              <div className="settings__toggles" style={{ marginTop: 12 }}>
                <label className="settings__toggle">
                  <div>
                    <strong>Require MFA for admin</strong>
                    <span>Stored for future enforcement; not required in the SPA yet.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(security.requireMfaForAdmin)}
                    onChange={(e) =>
                      setSecurity({ ...security, requireMfaForAdmin: e.target.checked })
                    }
                  />
                </label>
              </div>
            </section>
          ) : null}

          {tab === 'system' ? (
            <section>
              <div className="settings__section-head">
                <h2>System</h2>
                <p>Operational flags that change backend application behavior.</p>
              </div>
              <div className="settings__toggles">
                <label className="settings__toggle">
                  <div>
                    <strong>Maintenance mode</strong>
                    <span>Public/applicant flows may be affected while enabled.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(system.maintenanceMode)}
                    onChange={(e) => setSystem({ ...system, maintenanceMode: e.target.checked })}
                  />
                </label>
                {system.maintenanceMode ? (
                  <div className="settings__banner settings__banner--warn">
                    Maintenance mode is on. Public/applicant flows may be affected.
                  </div>
                ) : null}

                <label className="settings__toggle">
                  <div>
                    <strong>Allow manual applications</strong>
                    <span>When off, Admin create-application API returns 403.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(system.allowManualApplications)}
                    onChange={(e) =>
                      setSystem({ ...system, allowManualApplications: e.target.checked })
                    }
                  />
                </label>
                {!system.allowManualApplications ? (
                  <div className="settings__banner settings__banner--warn">
                    Manual application creation via Admin API will be blocked.
                  </div>
                ) : null}

                <label className="settings__toggle">
                  <div>
                    <strong>Auto-generate visa on approve</strong>
                    <span>When off, approve will not auto-issue a visa PDF.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(system.autoGenerateVisaOnApprove)}
                    onChange={(e) =>
                      setSystem({ ...system, autoGenerateVisaOnApprove: e.target.checked })
                    }
                  />
                </label>
                {!system.autoGenerateVisaOnApprove ? (
                  <div className="settings__banner settings__banner--warn">
                    Approving an application will not auto-issue a visa PDF.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {tab === 'email' ? (
            <section>
              <div className="settings__section-head">
                <h2>Email templates</h2>
                <p>Upsert templates by unique code used when sending platform emails.</p>
              </div>

              {tplError ? <div className="settings__banner settings__banner--error">{tplError}</div> : null}
              {tplSuccess ? (
                <div className="settings__banner settings__banner--success">
                  {tplSuccess}{' '}
                  <Link to="/audit-logs?action=email_template.upsert">View audit logs</Link>
                </div>
              ) : null}

              <div className="settings__tpl-toolbar">
                <span className="settings__hint">
                  {templatesLoading ? 'Loading…' : `${templates.length} templates`}
                </span>
                <button type="button" onClick={startNewTemplate}>
                  New template
                </button>
              </div>

              <div className="settings__templates">
                <div className="settings__tpl-list">
                  {!templatesLoading && templates.length === 0 ? (
                    <p className="settings__empty">No templates yet. Create one to get started.</p>
                  ) : null}
                  {templates.map((tpl) => (
                    <button
                      key={tpl._id}
                      type="button"
                      className={`settings__tpl-item${
                        selectedCode === tpl.code && tplMode === 'edit' ? ' is-active' : ''
                      }`}
                      onClick={() => selectTemplate(tpl)}
                    >
                      <span>
                        <div>{tpl.name}</div>
                        <code>{tpl.code}</code>
                      </span>
                      <span
                        className={`settings__pill settings__pill--${tpl.isActive ? 'yes' : 'no'}`}
                      >
                        {tpl.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  ))}
                </div>

                <form onSubmit={(e) => void onSaveTemplate(e)}>
                  <div className="settings__grid">
                    <label className="settings__field">
                      Code
                      <input
                        value={tplForm.code}
                        onChange={(e) =>
                          setTplForm({ ...tplForm, code: e.target.value.trim().toLowerCase() })
                        }
                        disabled={tplMode === 'edit'}
                        required
                        placeholder="e.g. visa_issued"
                      />
                      <span className="settings__hint">
                        {tplMode === 'edit' ? 'Code is read-only for existing templates' : 'Unique code'}
                      </span>
                    </label>
                    <label className="settings__field">
                      Name
                      <input
                        value={tplForm.name}
                        onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                        required
                      />
                    </label>
                    <label className="settings__field settings__field--full">
                      Subject
                      <input
                        value={tplForm.subject}
                        onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })}
                        required
                      />
                    </label>
                    <label className="settings__field settings__field--full">
                      HTML body
                      <textarea
                        className="is-mono"
                        value={tplForm.htmlBody}
                        onChange={(e) => setTplForm({ ...tplForm, htmlBody: e.target.value })}
                        required
                      />
                    </label>
                    <label className="settings__field settings__field--full">
                      Text body (optional)
                      <textarea
                        value={tplForm.textBody}
                        onChange={(e) => setTplForm({ ...tplForm, textBody: e.target.value })}
                      />
                    </label>
                    <div className="settings__field settings__field--full">
                      Placeholders
                      <div className="settings__tag-row">
                        <input
                          value={placeholderDraft}
                          onChange={(e) => setPlaceholderDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const v = placeholderDraft.trim();
                              if (!v || tplForm.placeholders.includes(v)) return;
                              setTplForm({
                                ...tplForm,
                                placeholders: [...tplForm.placeholders, v],
                              });
                              setPlaceholderDraft('');
                            }
                          }}
                          placeholder="e.g. referenceId"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = placeholderDraft.trim();
                            if (!v || tplForm.placeholders.includes(v)) return;
                            setTplForm({
                              ...tplForm,
                              placeholders: [...tplForm.placeholders, v],
                            });
                            setPlaceholderDraft('');
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div className="settings__chips">
                        {tplForm.placeholders.map((p) => (
                          <span key={p} className="settings__chip">
                            {`{{${p}}}`}
                            <button
                              type="button"
                              aria-label={`Remove ${p}`}
                              onClick={() =>
                                setTplForm({
                                  ...tplForm,
                                  placeholders: tplForm.placeholders.filter((x) => x !== p),
                                })
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="settings__toggles" style={{ marginTop: 12 }}>
                    <label className="settings__toggle">
                      <div>
                        <strong>Active</strong>
                        <span>Inactive templates are not used when sending mail.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={tplForm.isActive}
                        onChange={(e) => setTplForm({ ...tplForm, isActive: e.target.checked })}
                      />
                    </label>
                  </div>
                  <div className="settings__actions">
                    <button type="submit" className="is-primary" disabled={tplSaving}>
                      {tplSaving ? 'Saving…' : 'Save template'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {showPlatformActions ? (
            <>
              <p className="settings__meta">
                Last updated {formatDate(metaUpdatedAt)}
                {metaUpdatedBy ? ` · by ${metaUpdatedBy}` : ''}
              </p>
              <div className="settings__actions">
                <button type="button" className="is-ghost" onClick={resetForms} disabled={saving}>
                  Reset
                </button>
                <button
                  type="button"
                  className="is-primary"
                  disabled={saving || !dirtyPatch}
                  onClick={() => void onSavePlatform()}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
