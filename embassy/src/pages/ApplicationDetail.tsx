import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  MessagesSquare,
  Plane,
  Send,
  Shield,
  Stamp,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  addApplicationNote,
  decideApplication,
  deleteApplication,
  formatDate,
  getApplication,
  getVisaDraft,
  issueVisa,
  openApplicationDocument,
  previewVisaPdf,
  staffLabel,
  statusLabel,
  type ApplicationDetail as ApplicationDetailType,
  type DecideStatus,
  type VisaDraftFields,
} from '../api/applications';
import { ApiError } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import './ApplicationDetail.css';

const POLL_MS = 5000;
const DECIDE_STATUSES: DecideStatus[] = [
  'under_embassy_review',
  'approved',
  'rejected',
  'documents_required',
];

const EMPTY_DRAFT: VisaDraftFields = {
  fullName: '',
  email: '',
  dateOfBirth: '',
  sex: '',
  nationality: '',
  passportNumber: '',
  issuingCountry: '',
  issueDate: '',
  expiryDate: '',
  purpose: '',
  intendedEntryDate: '',
  intendedExitDate: '',
  addressInAfghanistan: '',
  remarks: '',
  placeOfIssue: '',
};

function draftFromApp(app: ApplicationDetailType): VisaDraftFields {
  const toIso = (v?: string) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };
  return {
    fullName: app.personal?.fullName || '',
    email: app.personal?.email || '',
    dateOfBirth: toIso(app.personal?.dateOfBirth),
    sex: app.personal?.sex || '',
    nationality: app.personal?.nationality || '',
    passportNumber: app.passport?.passportNumber || '',
    issuingCountry: app.passport?.issuingCountry || '',
    issueDate: toIso(app.passport?.issueDate),
    expiryDate: toIso(app.passport?.expiryDate),
    purpose: app.travel?.purpose || '',
    intendedEntryDate: toIso(app.travel?.intendedEntryDate),
    intendedExitDate: toIso(app.travel?.intendedExitDate),
    addressInAfghanistan: app.travel?.addressInAfghanistan || '',
    remarks: '',
    placeOfIssue: '',
  };
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { embassy } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const missionLabel =
    embassy?.code && embassy?.name
      ? `${embassy.name} (${embassy.code})`
      : embassy?.name || embassy?.code || 'Embassy';
  const [app, setApp] = useState<ApplicationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const [docsOpen, setDocsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [docNote, setDocNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [draftFields, setDraftFields] = useState<VisaDraftFields>(EMPTY_DRAFT);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewMeta, setPreviewMeta] = useState<{
    visaNumber?: string;
    applicantEmail?: string;
    applicantName?: string;
  } | null>(null);
  const [sendEmailOnIssue, setSendEmailOnIssue] = useState(true);
  const previewUrlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getApplication(id);
      setApp(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load application');
      if (err instanceof ApiError && err.status === 404) setApp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [id, load]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  if (!id) return <Navigate to="/applications" replace />;
  if (!loading && !app && error) {
    return (
      <div className="app-detail app-detail--simple">
        <p>{error}</p>
        <Link to="/applications">Back to applications</Link>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="app-detail app-detail--simple">
        <p>Loading application…</p>
      </div>
    );
  }

  const current = app;
  const allowed = new Set(
    (current.allowedNextStatuses || []).filter((s): s is DecideStatus =>
      DECIDE_STATUSES.includes(s as DecideStatus)
    )
  );

  // Fallback: after request-docs the UI still needs approve/reject even if API lags
  const canStartReview =
    allowed.has('under_embassy_review') || current.status === 'documents_required';
  const canApprove =
    allowed.has('approved') ||
    current.status === 'sent_to_embassy' ||
    current.status === 'under_embassy_review' ||
    current.status === 'documents_required';
  const canReject =
    allowed.has('rejected') ||
    current.status === 'sent_to_embassy' ||
    current.status === 'under_embassy_review' ||
    current.status === 'documents_required';
  const canRequestDocs =
    allowed.has('documents_required') ||
    current.status === 'sent_to_embassy' ||
    current.status === 'under_embassy_review' ||
    current.status === 'documents_required';
  const canGenerateVisa =
    current.status === 'approved' || current.status === 'visa_issued';

  const age = current.personal?.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(current.personal.dateOfBirth).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

  const assigneeName = staffLabel(current.assignedEmbassyStaff);
  const assigneeInitials =
    assigneeName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—';

  async function runDecide(toStatus: DecideStatus, note?: string) {
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await decideApplication(id, { toStatus, note });
      const fresh = await getApplication(id);
      setApp(fresh.data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Decision failed');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  async function onRequestDocs(e: FormEvent) {
    e.preventDefault();
    if (!docNote.trim()) return;
    try {
      await runDecide('documents_required', docNote.trim());
      setDocsOpen(false);
      setDocNote('');
    } catch {
      /* error shown */
    }
  }

  async function onReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      await runDecide('rejected', rejectReason.trim());
      setRejectOpen(false);
      setRejectReason('');
    } catch {
      /* error shown */
    }
  }

  async function onApprove() {
    try {
      await runDecide('approved', 'Approved by embassy');
    } catch {
      /* error shown */
    }
  }

  async function onStartReview() {
    try {
      await runDecide('under_embassy_review', 'Taken under embassy review');
    } catch {
      /* error shown */
    }
  }

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }

  function closeIssueModal() {
    setIssueOpen(false);
    setPreviewError('');
    setPreviewMeta(null);
    setPreviewLoading(false);
    revokePreviewUrl();
  }

  async function refreshPreview(overrides: VisaDraftFields) {
    if (!id) return;
    setPreviewLoading(true);
    setPreviewError('');
    revokePreviewUrl();
    try {
      const preview = await previewVisaPdf(id, overrides);
      const url = URL.createObjectURL(preview.blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPreviewMeta({
        visaNumber: preview.visaNumber,
        applicantEmail: preview.applicantEmail,
        applicantName: preview.applicantName,
      });
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : 'Failed to generate visa preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openIssueModal() {
    if (!id) return;
    setActionError('');
    setPreviewError('');
    setSendEmailOnIssue(true);
    setIssueOpen(true);
    setDraftFields(draftFromApp(current));
    setPreviewLoading(true);
    revokePreviewUrl();
    try {
      const draft = await getVisaDraft(id);
      const fields = { ...EMPTY_DRAFT, ...draft.data.draftFields };
      setDraftFields(fields);
      await refreshPreview(fields);
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : 'Failed to load visa draft');
      setPreviewLoading(false);
    }
  }

  async function onSaveAndSendVisa(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await issueVisa(id, {
        sendEmail: sendEmailOnIssue,
        force: current.status === 'visa_issued',
        fieldOverrides: draftFields,
      });
      const fresh = await getApplication(id);
      setApp(fresh.data);
      closeIssueModal();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to save and send visa');
      try {
        const fresh = await getApplication(id);
        setApp(fresh.data);
      } catch {
        /* keep current */
      }
    } finally {
      setActionLoading(false);
    }
  }

  function updateDraftField<K extends keyof VisaDraftFields>(key: K, value: VisaDraftFields[K]) {
    setDraftFields((prev) => ({ ...prev, [key]: value }));
  }

  async function onSendNote(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await addApplicationNote(id, draft.trim());
      setDraft('');
      const fresh = await getApplication(id);
      setApp(fresh.data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to add note');
    } finally {
      setActionLoading(false);
    }
  }

  function copyId() {
    void navigator.clipboard.writeText(current.referenceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const requested = current.requestedDocuments || [];
  const uploaded = current.documents || [];
  const notes = (current.activity || []).filter((a) => a.note);

  return (
    <div className="app-detail">
      <header className="app-detail__header">
        <nav className="app-detail__crumbs" aria-label="Breadcrumb">
          <Link to="/applications">Applications</Link>
          <span aria-hidden>/</span>
          <span>{statusLabel(current.status)}</span>
          <span aria-hidden>/</span>
          <strong>{current.referenceId}</strong>
        </nav>

        <div className="app-detail__actions">
          {canStartReview ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--purple"
              onClick={() => void onStartReview()}
              disabled={actionLoading}
            >
              Start review
            </button>
          ) : null}

          {canRequestDocs ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--amber"
              onClick={() => {
                setActionError('');
                setDocsOpen(true);
              }}
              disabled={actionLoading}
            >
              Request documents
            </button>
          ) : null}

          {canApprove ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--green"
              onClick={() => void onApprove()}
              disabled={actionLoading}
            >
              <CheckCircle2 size={16} />
              Approve
            </button>
          ) : null}

          {canReject ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--danger"
              onClick={() => {
                setActionError('');
                setRejectOpen(true);
              }}
              disabled={actionLoading}
            >
              Reject visa
            </button>
          ) : null}

          {canGenerateVisa ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--green"
              onClick={() => void openIssueModal()}
              disabled={actionLoading}
            >
              <Stamp size={16} />
              {current.status === 'visa_issued' ? 'Re-issue visa' : 'Generate visa'}
            </button>
          ) : null}

          <Link
            to={`/chat?application=${current._id}`}
            className="app-detail__btn app-detail__btn--purple"
          >
            <MessagesSquare size={16} />
            Open chat
          </Link>

          <button
            type="button"
            className="app-detail__btn app-detail__btn--delete"
            aria-label="Delete application"
            title="Delete application"
            onClick={() => setDeleteOpen(true)}
            disabled={actionLoading}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </header>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete application"
        message={
          <>
            You are about to permanently delete <strong>{current.referenceId}</strong> along with
            all its documents, chats, and issued visa. This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        busy={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteApplication(current._id);
            navigate('/applications', { replace: true });
          } catch (err) {
            setActionError(err instanceof ApiError ? err.message : 'Delete failed');
            setDeleteOpen(false);
          } finally {
            setDeleting(false);
          }
        }}
      />

      <div className="app-detail__body">
        {actionError ? (
          <div className="app-detail__alert app-detail__alert--error">{actionError}</div>
        ) : null}

        {app.documentRequestNote || app.status === 'documents_required' ? (
          <div className="app-detail__alert" role="status">
            {app.documentRequestNote || 'Documents have been requested from the applicant.'}
          </div>
        ) : null}

        {app.rejectionReason ? (
          <div className="app-detail__alert app-detail__alert--error" role="status">
            Rejected: {app.rejectionReason}
          </div>
        ) : null}

        {app.issuedVisa?.visaNumber ? (
          <div className="app-detail__alert app-detail__alert--success" role="status">
            Visa issued: {app.issuedVisa.visaNumber}
          </div>
        ) : null}

        <div className="app-detail__top">
          <section className="info-card app-detail__doc">
            <div className="app-detail__doc-main">
              <div className="app-detail__pdf" aria-hidden>
                <FileText size={28} strokeWidth={1.75} />
                <span>APP</span>
              </div>
              <div className="app-detail__doc-meta">
                <h2>{app.personal?.fullName || 'Applicant'}</h2>
                <p>
                  {app.visaTypeCode} · Received{' '}
                  {formatDate(app.sentToEmbassyAt || app.submittedAt || app.createdAt)}
                </p>
                <StatusPill status={app.status} />
              </div>
            </div>

            <div className="app-detail__doc-grid">
              <div>
                <span className="info-card__label">Reference ID</span>
                <button type="button" className="app-detail__copy" onClick={copyId}>
                  <strong>{app.referenceId}</strong>
                  <Copy size={14} />
                  {copied ? <em>Copied</em> : null}
                </button>
              </div>
              <div>
                <span className="info-card__label">Assigned to</span>
                <div className="app-detail__assignee">
                  <span className="app-detail__avatar">{assigneeInitials}</span>
                  <strong>{assigneeName}</strong>
                </div>
              </div>
            </div>

            <div className="app-detail__doc-list">
              <h3>Documents</h3>
              {requested.length === 0 && uploaded.length === 0 ? (
                <p className="app-detail__muted">No documents yet.</p>
              ) : null}

              {requested.map((doc) => (
                <div key={`${doc.key}-${doc.requestedAt || doc.name}`} className="app-detail__doc-row">
                  <div>
                    <strong>{doc.name}</strong>
                    <span>Request sent</span>
                  </div>
                  <span
                    className={`app-detail__req-status app-detail__req-status--${
                      doc.status === 'uploaded' ? 'uploaded' : 'pending'
                    }`}
                  >
                    {doc.status === 'uploaded' ? 'Uploaded' : 'Pending'}
                  </span>
                </div>
              ))}

              {uploaded.map((doc) => (
                <div key={doc._id} className="app-detail__doc-row">
                  <div>
                    <strong>{doc.label || doc.originalName}</strong>
                    <span>
                      {doc.category.replaceAll('_', ' ')} · {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="app-detail__req-status app-detail__req-status--received"
                    onClick={() => void openApplicationDocument(app._id, doc._id)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="info-card app-detail__chat">
            <div className="app-detail__chat-head">
              <h3>Case notes</h3>
              <span>Internal activity for this mission</span>
            </div>

            <div className="app-detail__messages">
              {notes.slice(-8).map((msg, idx) => (
                <div
                  key={`${msg.at}-${idx}`}
                  className={`app-detail__bubble ${
                    msg.actorType === 'embassy' ? 'is-out' : 'is-in'
                  }`}
                >
                  <p>{msg.note}</p>
                  <span>
                    {msg.actorName || msg.action} · {formatDate(msg.at)}
                  </span>
                </div>
              ))}
              {!notes.length ? (
                <div className="app-detail__bubble is-in">
                  <p>No notes yet. Add an internal note below.</p>
                  <span>System</span>
                </div>
              ) : null}
            </div>

            <form className="app-detail__composer" onSubmit={(e) => void onSendNote(e)}>
              <input
                type="text"
                placeholder="Add an internal note…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" disabled={!draft.trim() || actionLoading}>
                <Send size={16} />
                Save
              </button>
            </form>
          </section>
        </div>

        <div className="app-detail__bottom">
          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--purple">
                <UserRound size={16} />
              </span>
              <h3>Applicant information</h3>
            </header>
            <dl className="info-card__grid">
              <div>
                <dt>Full name</dt>
                <dd>{app.personal?.fullName || '—'}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{formatDate(app.personal?.dateOfBirth)}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{age ?? '—'}</dd>
              </div>
              <div>
                <dt>Sex</dt>
                <dd>{app.personal?.sex || '—'}</dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd>{app.personal?.nationality || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{app.personal?.email || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--gold">
                <Shield size={16} />
              </span>
              <h3>Passport information</h3>
            </header>
            <dl className="info-card__grid">
              <div>
                <dt>Passport number</dt>
                <dd>{app.passport?.passportNumber || '—'}</dd>
              </div>
              <div>
                <dt>Issuing country</dt>
                <dd>{app.passport?.issuingCountry || '—'}</dd>
              </div>
              <div>
                <dt>Issue date</dt>
                <dd>{formatDate(app.passport?.issueDate)}</dd>
              </div>
              <div>
                <dt>Expiry date</dt>
                <dd>{formatDate(app.passport?.expiryDate)}</dd>
              </div>
            </dl>
          </section>

          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--ink">
                <Plane size={16} />
              </span>
              <h3>Travel details</h3>
            </header>
            <dl className="info-card__grid">
              <div>
                <dt>Purpose</dt>
                <dd>{app.travel?.purpose || '—'}</dd>
              </div>
              <div>
                <dt>Mission</dt>
                <dd>
                  <span className="app-detail__embassy">
                    <Building2 size={14} />
                    {missionLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Entry date</dt>
                <dd>{formatDate(app.travel?.intendedEntryDate)}</dd>
              </div>
              <div>
                <dt>Exit date</dt>
                <dd>{formatDate(app.travel?.intendedExitDate)}</dd>
              </div>
              <div className="info-card__span">
                <dt>Address in Afghanistan</dt>
                <dd>{app.travel?.addressInAfghanistan || '—'}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{app.paymentStatus || '—'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <Modal open={docsOpen} title="Request documents" onClose={() => setDocsOpen(false)}>
        <form className="modal-form" onSubmit={(e) => void onRequestDocs(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}
          <label>
            Message to applicant
            <textarea
              value={docNote}
              onChange={(e) => setDocNote(e.target.value)}
              placeholder="Describe which documents are needed…"
              required
              autoFocus
            />
          </label>
          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={() => setDocsOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="is-primary" disabled={actionLoading || !docNote.trim()}>
              {actionLoading ? 'Sending…' : 'Request documents'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={rejectOpen} title="Reject visa" onClose={() => setRejectOpen(false)}>
        <form className="modal-form" onSubmit={(e) => void onReject(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}
          <label>
            Rejection reason
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason shared with the applicant…"
              required
              autoFocus
            />
          </label>
          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="is-danger"
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? 'Rejecting…' : 'Reject visa'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={issueOpen}
        title={current.status === 'visa_issued' ? 'Re-issue visa' : 'Generate visa'}
        onClose={closeIssueModal}
        className="modal--visa-preview"
      >
        <form className="modal-form visa-issue-preview" onSubmit={(e) => void onSaveAndSendVisa(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}

          <p className="visa-issue-preview__meta">
            Autofilled from the application. Check or edit details, refresh the PDF preview, then
            save &amp; send. A scannable QR code on the PDF opens the visa for download/view and
            appears automatically in the admin panel and applicant profile.
          </p>

          <div className="visa-issue-preview__layout">
            <div>
              <div className="visa-issue-preview__fields">
                <label>
                  Full name
                  <input
                    value={draftFields.fullName || ''}
                    onChange={(e) => updateDraftField('fullName', e.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={draftFields.email || ''}
                    onChange={(e) => updateDraftField('email', e.target.value)}
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={draftFields.dateOfBirth || ''}
                    onChange={(e) => updateDraftField('dateOfBirth', e.target.value)}
                  />
                </label>
                <label>
                  Sex
                  <input
                    value={draftFields.sex || ''}
                    onChange={(e) => updateDraftField('sex', e.target.value)}
                  />
                </label>
                <label>
                  Nationality
                  <input
                    value={draftFields.nationality || ''}
                    onChange={(e) => updateDraftField('nationality', e.target.value)}
                  />
                </label>
                <label>
                  Passport number
                  <input
                    value={draftFields.passportNumber || ''}
                    onChange={(e) => updateDraftField('passportNumber', e.target.value)}
                  />
                </label>
                <label>
                  Issuing country
                  <input
                    value={draftFields.issuingCountry || ''}
                    onChange={(e) => updateDraftField('issuingCountry', e.target.value)}
                  />
                </label>
                <label>
                  Passport issue
                  <input
                    type="date"
                    value={draftFields.issueDate || ''}
                    onChange={(e) => updateDraftField('issueDate', e.target.value)}
                  />
                </label>
                <label>
                  Passport expiry
                  <input
                    type="date"
                    value={draftFields.expiryDate || ''}
                    onChange={(e) => updateDraftField('expiryDate', e.target.value)}
                  />
                </label>
                <label>
                  Entry date
                  <input
                    type="date"
                    value={draftFields.intendedEntryDate || ''}
                    onChange={(e) => updateDraftField('intendedEntryDate', e.target.value)}
                  />
                </label>
                <label>
                  Exit date
                  <input
                    type="date"
                    value={draftFields.intendedExitDate || ''}
                    onChange={(e) => updateDraftField('intendedExitDate', e.target.value)}
                  />
                </label>
                <label className="is-span">
                  Purpose
                  <input
                    value={draftFields.purpose || ''}
                    onChange={(e) => updateDraftField('purpose', e.target.value)}
                  />
                </label>
                <label className="is-span">
                  Address in Afghanistan
                  <input
                    value={draftFields.addressInAfghanistan || ''}
                    onChange={(e) => updateDraftField('addressInAfghanistan', e.target.value)}
                  />
                </label>
                <label className="is-span">
                  Remarks
                  <textarea
                    value={draftFields.remarks || ''}
                    onChange={(e) => updateDraftField('remarks', e.target.value)}
                  />
                </label>
              </div>
              <div className="visa-issue-preview__toolbar">
                <button
                  type="button"
                  disabled={previewLoading || actionLoading}
                  onClick={() => void refreshPreview(draftFields)}
                >
                  {previewLoading ? 'Refreshing…' : 'Refresh preview'}
                </button>
              </div>
            </div>

            <div className="visa-issue-preview__frame-wrap">
              {previewLoading ? (
                <div className="visa-issue-preview__loading">Generating visa PDF preview…</div>
              ) : null}
              {previewError ? <div className="visa-issue-preview__error">{previewError}</div> : null}
              {!previewLoading && previewUrl ? (
                <iframe
                  className="visa-issue-preview__frame"
                  title="Visa PDF preview"
                  src={previewUrl}
                />
              ) : null}
            </div>
          </div>

          {previewMeta ? (
            <p className="visa-issue-preview__meta">
              Preview for <strong>{previewMeta.applicantName || 'applicant'}</strong>
              {previewMeta.applicantEmail ? (
                <>
                  {' '}
                  · <strong>{previewMeta.applicantEmail}</strong>
                </>
              ) : null}
              {previewMeta.visaNumber ? (
                <>
                  {' '}
                  · draft no. <strong>{previewMeta.visaNumber}</strong>
                </>
              ) : null}
            </p>
          ) : null}

          <label className="visa-issue-preview__check">
            <input
              type="checkbox"
              checked={sendEmailOnIssue}
              onChange={(e) => setSendEmailOnIssue(e.target.checked)}
            />
            <span>
              Notify applicant that the visa is ready to view/download
              {previewMeta?.applicantEmail || draftFields.email
                ? ` (${previewMeta?.applicantEmail || draftFields.email})`
                : ''}
            </span>
          </label>

          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={closeIssueModal} disabled={actionLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="is-primary"
              disabled={actionLoading || previewLoading || !previewUrl || Boolean(previewError)}
            >
              {actionLoading
                ? 'Saving…'
                : sendEmailOnIssue
                  ? 'Save & send to applicant'
                  : 'Save to documents'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
