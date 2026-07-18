import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileUp,
  Printer,
  Search,
  UserPlus,
} from 'lucide-react';
import {
  formatDate,
  getApplication,
  type ApplicationDetail,
  type ApplicationStatus,
} from '../api/applications';
import { listVisaTypesForPicker, type VisaTypeOption } from '../api/embassies';
import {
  createWalkInApplication,
  deliverWalkInDocument,
  formatDateTime,
  listTodayWalkIns,
  lookupApplications,
  recordCounterPayment,
  statusGuidance,
  submitWalkInApplication,
  type LookupResult,
} from '../api/receptionist';
import { ApiError } from '../api/client';
import { StatusPill } from '../components/StatusPill';
import './Receptionist.css';

type Tab = 'track' | 'new' | 'today';

const EMPTY_FORM = {
  visaTypeCode: '',
  fullName: '',
  email: '',
  phone: '',
  nationality: '',
  dateOfBirth: '',
  sex: '',
  passportNumber: '',
  passportExpiry: '',
  purpose: '',
  intendedEntryDate: '',
  processingSpeed: 'standard',
};

export function Receptionist() {
  const [tab, setTab] = useState<Tab>('track');
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [visaTypes, setVisaTypes] = useState<VisaTypeOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitMode, setSubmitMode] = useState<'draft' | 'pending'>('pending');
  const [creating, setCreating] = useState(false);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');

  const [todayRows, setTodayRows] = useState<LookupResult[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('80');
  const [paymentNotes, setPaymentNotes] = useState('Cash at counter');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActionError('');
    try {
      const { data } = await getApplication(id);
      setDetail(data);
      setSelectedId(id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to load application');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void listVisaTypesForPicker().then(({ data }) => setVisaTypes(data || []));
  }, []);

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const { data } = await listTodayWalkIns();
      const today = new Date().toDateString();
      const filtered = (data || []).filter(
        (row) => row.createdAt && new Date(row.createdAt).toDateString() === today
      );
      setTodayRows(filtered as LookupResult[]);
    } catch {
      setTodayRows([]);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'today') void loadToday();
  }, [tab, loadToday]);

  async function onSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = searchInput.trim();
    if (q.length < 2) {
      setSearchError('Enter at least 2 characters (reference, name, email, phone, or passport).');
      return;
    }
    setSearching(true);
    setSearchError('');
    setActionMsg('');
    try {
      const { data } = await lookupApplications(q);
      setResults(data || []);
      if (!data?.length) setSearchError('No applications found.');
      else if (data.length === 1) void loadDetail(data[0]._id);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function onCreateIntake(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setActionError('');
    setCreatedRef(null);
    try {
      const { data } = await createWalkInApplication({
        visaTypeCode: form.visaTypeCode,
        source: 'walk_in',
        submit: submitMode === 'pending',
        personal: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          nationality: form.nationality.trim().toUpperCase(),
          dateOfBirth: form.dateOfBirth || undefined,
          sex: form.sex || undefined,
        },
        passport: {
          passportNumber: form.passportNumber.trim() || undefined,
          expiryDate: form.passportExpiry || undefined,
        },
        travel: {
          purpose: form.purpose.trim() || undefined,
          intendedEntryDate: form.intendedEntryDate || undefined,
          processingSpeed: form.processingSpeed || 'standard',
        },
      });
      setCreatedRef(data.referenceId);
      setCreatedName(form.fullName.trim());
      setForm(EMPTY_FORM);
      setTab('track');
      setSearchInput(data.referenceId);
      void onSearch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not create application');
    } finally {
      setCreating(false);
    }
  }

  async function onSubmitDraft() {
    if (!selectedId) return;
    setActionError('');
    setActionMsg('');
    try {
      await submitWalkInApplication(selectedId);
      setActionMsg('Application submitted to processing queue.');
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Submit failed');
    }
  }

  async function onRecordPayment() {
    if (!selectedId) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter a valid payment amount.');
      return;
    }
    setRecordingPayment(true);
    setActionError('');
    try {
      await recordCounterPayment({
        applicationId: selectedId,
        amount,
        notes: paymentNotes.trim() || undefined,
      });
      setActionMsg('Payment recorded successfully.');
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Payment recording failed');
    } finally {
      setRecordingPayment(false);
    }
  }

  async function onUploadDocument(file: File) {
    if (!selectedId) return;
    setUploadingDoc(true);
    setActionError('');
    try {
      await deliverWalkInDocument(selectedId, file, {
        label: file.name,
        key: 'walk_in_scan',
        note: 'Scanned at reception counter',
      });
      setActionMsg('Document uploaded.');
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  }

  function copyReference(ref: string) {
    void navigator.clipboard.writeText(ref);
    setActionMsg(`Copied ${ref} to clipboard.`);
  }

  function printSlip(ref: string, name: string) {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>${ref}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#1a2e28}
        h1{font-size:18px;margin:0 0 8px}
        .ref{font-size:22px;font-weight:700;letter-spacing:.04em;margin:12px 0}
        .meta{font-size:13px;color:#555;line-height:1.5}
        hr{border:none;border-top:1px dashed #ccc;margin:16px 0}
      </style></head><body>
        <h1>Salaam Afghanistan — Walk-in receipt</h1>
        <div class="ref">${ref}</div>
        <div class="meta"><strong>Applicant:</strong> ${name}<br>
        <strong>Date:</strong> ${new Date().toLocaleString()}<br>
        Keep this reference to track your application status online or at the desk.</div>
        <hr><p class="meta">Raizing Global · Digital Visa Services</p>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  const canSubmit = detail?.status === 'draft' && detail.allowedNextStatuses?.includes('pending');
  const canPay = detail && detail.paymentStatus !== 'paid';

  const selectedSummary = useMemo(() => {
    if (detail) return detail;
    return results.find((r) => r._id === selectedId) || null;
  }, [detail, results, selectedId]);

  return (
    <div className="reception">
      <header className="reception__header">
        <div>
          <h1>Reception Desk</h1>
          <p>Walk-in intake, status lookup, counter payment, and document scanning.</p>
        </div>
        <div className="reception__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={tab === 'track' ? 'is-active' : ''}
            onClick={() => setTab('track')}
          >
            <Search size={16} /> Track
          </button>
          <button
            type="button"
            role="tab"
            className={tab === 'new' ? 'is-active' : ''}
            onClick={() => setTab('new')}
          >
            <UserPlus size={16} /> New walk-in
          </button>
          <button
            type="button"
            role="tab"
            className={tab === 'today' ? 'is-active' : ''}
            onClick={() => setTab('today')}
          >
            <ClipboardList size={16} /> Today
          </button>
        </div>
      </header>

      {(actionError || actionMsg) && (
        <div className={`reception__banner${actionError ? ' reception__banner--error' : ''}`}>
          {actionError || actionMsg}
        </div>
      )}

      {createdRef ? (
        <div className="reception__success">
          <CheckCircle2 size={20} />
          <span>
            Application <strong>{createdRef}</strong> created.
          </span>
          <button type="button" onClick={() => copyReference(createdRef)}>
            <Copy size={14} /> Copy ref
          </button>
          <button type="button" onClick={() => printSlip(createdRef, createdName || 'Applicant')}>
            <Printer size={14} /> Print slip
          </button>
        </div>
      ) : null}

      {tab === 'track' ? (
        <div className="reception__grid">
          <section className="reception__panel">
            <form className="reception__search" onSubmit={onSearch}>
              <Search size={18} aria-hidden />
              <input
                type="search"
                placeholder="Reference, name, email, phone, or passport…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
              />
              <button type="submit" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>
            {searchError ? <p className="reception__hint reception__hint--error">{searchError}</p> : null}

            <ul className="reception__results">
              {results.map((row) => (
                <li key={row._id}>
                  <button
                    type="button"
                    className={selectedId === row._id ? 'is-selected' : ''}
                    onClick={() => void loadDetail(row._id)}
                  >
                    <span className="reception__ref">{row.referenceId}</span>
                    <span className="reception__name">{row.personal?.fullName || '—'}</span>
                    <StatusPill status={row.status} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="reception__panel reception__detail">
            {!selectedSummary ? (
              <p className="reception__empty">Search or select an application to view status and actions.</p>
            ) : detailLoading ? (
              <p className="reception__empty">Loading…</p>
            ) : (
              <>
                <div className="reception__detail-head">
                  <div>
                    <h2>{selectedSummary.referenceId}</h2>
                    <p>{selectedSummary.personal?.fullName}</p>
                  </div>
                  <StatusPill status={selectedSummary.status} />
                </div>

                <p className="reception__guidance">
                  {statusGuidance(selectedSummary.status as ApplicationStatus)}
                </p>

                <dl className="reception__meta">
                  <div>
                    <dt>Visa type</dt>
                    <dd>{selectedSummary.visaTypeCode || '—'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedSummary.personal?.email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selectedSummary.personal?.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>Passport</dt>
                    <dd>{selectedSummary.passport?.passportNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd className={detail?.paymentStatus === 'paid' ? 'is-paid' : ''}>
                      {detail?.paymentStatus || selectedSummary.paymentStatus || 'unpaid'}
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateTime(detail?.createdAt || selectedSummary.createdAt)}</dd>
                  </div>
                </dl>

                <div className="reception__actions">
                  <button
                    type="button"
                    className="reception__btn reception__btn--ghost"
                    onClick={() => copyReference(selectedSummary.referenceId)}
                  >
                    <Copy size={16} /> Copy reference
                  </button>
                  <button
                    type="button"
                    className="reception__btn reception__btn--ghost"
                    onClick={() =>
                      printSlip(
                        selectedSummary.referenceId,
                        selectedSummary.personal?.fullName || 'Applicant'
                      )
                    }
                  >
                    <Printer size={16} /> Print slip
                  </button>
                  {selectedId ? (
                    <Link to={`/applications/${selectedId}`} className="reception__btn reception__btn--ghost">
                      Open full record
                    </Link>
                  ) : null}
                </div>

                {canSubmit ? (
                  <div className="reception__card">
                    <h3>Submit to processing</h3>
                    <p>Move this draft into the pending queue for case managers.</p>
                    <button type="button" className="reception__btn reception__btn--primary" onClick={() => void onSubmitDraft()}>
                      Submit application
                    </button>
                  </div>
                ) : null}

                {canPay && selectedId ? (
                  <div className="reception__card">
                    <h3>
                      <Banknote size={18} /> Counter payment
                    </h3>
                    <div className="reception__pay-row">
                      <label>
                        Amount (USD)
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </label>
                      <label>
                        Notes
                        <input
                          type="text"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="reception__btn reception__btn--primary"
                      disabled={recordingPayment}
                      onClick={() => void onRecordPayment()}
                    >
                      {recordingPayment ? 'Recording…' : 'Record payment'}
                    </button>
                  </div>
                ) : null}

                {selectedId ? (
                  <div className="reception__card">
                    <h3>
                      <FileUp size={18} /> Scan / upload document
                    </h3>
                    <p>Attach passport copies or forms received at the counter.</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUploadDocument(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="reception__btn reception__btn--ghost"
                      disabled={uploadingDoc}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingDoc ? 'Uploading…' : 'Choose file'}
                    </button>
                    {detail?.documents?.length ? (
                      <ul className="reception__docs">
                        {detail.documents.slice(0, 5).map((doc) => (
                          <li key={doc._id}>{doc.label || doc.originalName}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'new' ? (
        <form className="reception__form reception__panel" onSubmit={onCreateIntake}>
          <h2>New walk-in application</h2>
          <p className="reception__hint">Collect applicant details at the desk. Save as draft if they need to return with documents.</p>

          <div className="reception__form-grid">
            <label>
              Visa type *
              <select
                required
                value={form.visaTypeCode}
                onChange={(e) => setForm((f) => ({ ...f, visaTypeCode: e.target.value }))}
              >
                <option value="">Select visa type</option>
                {visaTypes.map((vt) => (
                  <option key={vt.code} value={vt.code}>
                    {vt.name} ({vt.code})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Full name *
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </label>

            <label>
              Email *
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>

            <label>
              Nationality (ISO) *
              <input
                required
                placeholder="e.g. IND"
                maxLength={3}
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value.toUpperCase() }))}
              />
            </label>

            <label>
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </label>

            <label>
              Sex
              <select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Passport number
              <input
                value={form.passportNumber}
                onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value }))}
              />
            </label>

            <label>
              Passport expiry
              <input
                type="date"
                value={form.passportExpiry}
                onChange={(e) => setForm((f) => ({ ...f, passportExpiry: e.target.value }))}
              />
            </label>

            <label>
              Travel purpose
              <input
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </label>

            <label>
              Intended entry date
              <input
                type="date"
                value={form.intendedEntryDate}
                onChange={(e) => setForm((f) => ({ ...f, intendedEntryDate: e.target.value }))}
              />
            </label>

            <label>
              Processing speed
              <select
                value={form.processingSpeed}
                onChange={(e) => setForm((f) => ({ ...f, processingSpeed: e.target.value }))}
              >
                <option value="standard">Standard</option>
                <option value="express">Express</option>
              </select>
            </label>
          </div>

          <div className="reception__submit-mode">
            <label>
              <input
                type="radio"
                name="submitMode"
                checked={submitMode === 'pending'}
                onChange={() => setSubmitMode('pending')}
              />
              Submit now (pending queue)
            </label>
            <label>
              <input
                type="radio"
                name="submitMode"
                checked={submitMode === 'draft'}
                onChange={() => setSubmitMode('draft')}
              />
              Save as draft (applicant returns later)
            </label>
          </div>

          <button type="submit" className="reception__btn reception__btn--primary" disabled={creating}>
            {creating ? 'Creating…' : submitMode === 'pending' ? 'Create & submit' : 'Save draft'}
          </button>
        </form>
      ) : null}

      {tab === 'today' ? (
        <section className="reception__panel">
          <h2>Today&apos;s walk-ins</h2>
          {todayLoading ? <p className="reception__empty">Loading…</p> : null}
          {!todayLoading && todayRows.length === 0 ? (
            <p className="reception__empty">No walk-in applications registered today.</p>
          ) : null}
          <ul className="reception__results">
            {todayRows.map((row) => (
              <li key={row._id}>
                <button
                  type="button"
                  onClick={() => {
                    setTab('track');
                    setSelectedId(row._id);
                    void loadDetail(row._id);
                  }}
                >
                  <span className="reception__ref">{row.referenceId}</span>
                  <span className="reception__name">{row.personal?.fullName || '—'}</span>
                  <StatusPill status={row.status} />
                  <span className="reception__time">{formatDate(row.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
