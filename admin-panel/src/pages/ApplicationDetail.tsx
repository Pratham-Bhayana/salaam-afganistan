import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Plane,
  Send,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  changeApplicationStatus,
  deleteApplication,
  embassyLabel,
  formatDate,
  getApplication,
  requestDocuments,
  addApplicationNote,
  statusLabel,
  type ApplicationDetail as ApplicationDetailType,
  type ApplicationStatus,
} from '../api/applications';
import { listEmbassies, type Embassy } from '../api/embassies';
import {
  ensureApplicationRoom,
  formatChatTime,
  listChatMessages,
  sendChatMessage,
  type ChatMessage,
} from '../api/chat';
import {
  downloadApplicationDocument,
  issueVisa,
  previewVisaPdf,
} from '../api/issuedVisas';
import { ApiError, apiFetch, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import './ApplicationDetail.css';
import '../components/Modal.css';

const POLL_MS = 5000;
const CHAT_POLL_MS = 4000;

const PAYMENT_OPTIONS = ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partial'] as const;

type ApplicantForm = {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  nationality: string;
  email: string;
};

type PassportForm = {
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
};

type TravelForm = {
  purpose: string;
  embassy: string;
  entryDate: string;
  exitDate: string;
  addressInAfghanistan: string;
  payment: string;
};

function embassyIdOf(embassy: ApplicationDetailType['embassy']): string | null {
  if (!embassy) return null;
  if (typeof embassy === 'string') return embassy;
  return embassy._id || null;
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { staff } = useAuth();
  const canAccess =
    staffHasPermission(staff, 'applications:read') ||
    staffHasPermission(staff, 'applications:intake');
  const canChat = staffHasPermission(staff, 'chat:access');
  const canDelete = staffHasPermission(staff, 'applications:write');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canIssueVisa =
    staffHasPermission(staff, 'visas_issued:manage') || staff?.role === 'super_admin';
  const staffId = staff?.id || '';
  const [app, setApp] = useState<ApplicationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [chatTab, setChatTab] = useState<'applicant' | 'embassy'>('applicant');
  const [draft, setDraft] = useState('');
  const [embassyDraft, setEmbassyDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [sendEmbassyOpen, setSendEmbassyOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docNote, setDocNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [sendEmailOnIssue, setSendEmailOnIssue] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewMeta, setPreviewMeta] = useState<{
    visaNumber: string;
    applicantEmail: string;
    applicantName: string;
  } | null>(null);
  const [embassyChoices, setEmbassyChoices] = useState<Embassy[]>([]);
  const [embassyChoicesLoading, setEmbassyChoicesLoading] = useState(false);
  const [selectedEmbassyId, setSelectedEmbassyId] = useState('');
  const [sendNote, setSendNote] = useState('Forwarded for consular review');

  const [embassyRoomId, setEmbassyRoomId] = useState<string | null>(null);
  const [embassyMessages, setEmbassyMessages] = useState<ChatMessage[]>([]);
  const [embassyChatLoading, setEmbassyChatLoading] = useState(false);
  const [embassyChatSending, setEmbassyChatSending] = useState(false);
  const [embassyChatError, setEmbassyChatError] = useState('');
  const embassyMessagesRef = useRef<HTMLDivElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [editingCard, setEditingCard] = useState<'applicant' | 'passport' | 'travel' | null>(null);
  const [applicantForm, setApplicantForm] = useState<ApplicantForm>({
    fullName: '',
    dateOfBirth: '',
    sex: '',
    nationality: '',
    email: '',
  });
  const [passportForm, setPassportForm] = useState<PassportForm>({
    passportNumber: '',
    issuingCountry: '',
    issueDate: '',
    expiryDate: '',
  });
  const [travelForm, setTravelForm] = useState<TravelForm>({
    purpose: '',
    embassy: '',
    entryDate: '',
    exitDate: '',
    addressInAfghanistan: '',
    payment: '',
  });
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState('');

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
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [id, load]);

  const assignedEmbassyIdEarly = app ? embassyIdOf(app.embassy) : null;

  useEffect(() => {
    if (chatTab !== 'embassy' || !id || !canChat) return;
    const embassyId = assignedEmbassyIdEarly;
    if (!embassyId) {
      setEmbassyRoomId(null);
      setEmbassyMessages([]);
      setEmbassyChatError('');
      return;
    }

    let cancelled = false;
    (async () => {
      setEmbassyChatLoading(true);
      setEmbassyChatError('');
      try {
        const { data: room } = await ensureApplicationRoom({
          embassyId,
          applicationId: id,
          title: `Case chat — ${app?.referenceId || id}`,
        });
        if (cancelled || !room?._id) return;
        setEmbassyRoomId(room._id);
        const { data: msgs } = await listChatMessages(room._id, { limit: 100 });
        if (!cancelled) setEmbassyMessages(Array.isArray(msgs) ? msgs : []);
      } catch (err) {
        if (!cancelled) {
          setEmbassyChatError(
            err instanceof ApiError ? err.message : 'Failed to open embassy chat'
          );
        }
      } finally {
        if (!cancelled) setEmbassyChatLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatTab, id, canChat, assignedEmbassyIdEarly, app?.referenceId]);

  useEffect(() => {
    if (chatTab !== 'embassy' || !embassyRoomId) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const { data } = await listChatMessages(embassyRoomId, { limit: 100 });
          setEmbassyMessages(Array.isArray(data) ? data : []);
        } catch {
          /* keep last messages */
        }
      })();
    }, CHAT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [chatTab, embassyRoomId]);

  useEffect(() => {
    const el = embassyMessagesRef.current;
    if (!el || chatTab !== 'embassy') return;
    el.scrollTop = el.scrollHeight;
  }, [embassyMessages.length, chatTab, embassyRoomId]);

  if (!canAccess) return <Navigate to="/" replace />;
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

  const canRequestDocs =
    current.allowedNextStatuses?.includes('documents_required') ||
    current.status === 'documents_required';
  const canReject = current.allowedNextStatuses?.includes('rejected');
  const canSendEmbassy =
    current.allowedNextStatuses?.includes('sent_to_embassy') ||
    current.status === 'documents_required' ||
    current.status === 'pending';
  const canApprove = Boolean(canIssueVisa && current.allowedNextStatuses?.includes('approved'));
  const canIssueOnly = Boolean(
    canIssueVisa && (current.status === 'approved' || current.allowedNextStatuses?.includes('visa_issued'))
  );
  const assignedEmbassyId = embassyIdOf(current.embassy);

  const age = calcAge(current.personal?.dateOfBirth);

  const assigned = current.assignedCaseManager;
  const assigneeName = assigned
    ? `${assigned.firstName || ''} ${assigned.lastName || ''}`.trim() || assigned.email || '—'
    : 'Unassigned';
  const assigneeInitials =
    assigneeName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—';

  function startEditApplicant() {
    setCardError('');
    setApplicantForm({
      fullName: current.personal?.fullName || '',
      dateOfBirth: toDateInputValue(current.personal?.dateOfBirth),
      sex: current.personal?.sex || '',
      nationality: current.personal?.nationality || '',
      email: current.personal?.email || '',
    });
    setEditingCard('applicant');
  }

  function startEditPassport() {
    setCardError('');
    setPassportForm({
      passportNumber: current.passport?.passportNumber || '',
      issuingCountry: current.passport?.issuingCountry || '',
      issueDate: toDateInputValue(current.passport?.issueDate),
      expiryDate: toDateInputValue(current.passport?.expiryDate),
    });
    setEditingCard('passport');
  }

  async function startEditTravel() {
    setCardError('');
    setTravelForm({
      purpose: current.travel?.purpose || '',
      embassy: embassyIdOf(current.embassy) || '',
      entryDate: toDateInputValue(current.travel?.intendedEntryDate),
      exitDate: toDateInputValue(current.travel?.intendedExitDate),
      addressInAfghanistan: current.travel?.addressInAfghanistan || '',
      payment: current.paymentStatus || 'unpaid',
    });
    setEditingCard('travel');
    if (embassyChoices.length === 0) {
      setEmbassyChoicesLoading(true);
      try {
        const { data } = await listEmbassies({ isActive: true, limit: 100 });
        setEmbassyChoices(Array.isArray(data) ? data : []);
      } catch {
        /* keep empty list; select still usable with current id */
      } finally {
        setEmbassyChoicesLoading(false);
      }
    }
  }

  function cancelCardEdit() {
    setEditingCard(null);
    setCardError('');
    setCardSaving(false);
  }

  function mergeApplicationPatch(data: Partial<ApplicationDetailType>) {
    setApp((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        personal: data.personal ?? prev.personal,
        passport: data.passport ?? prev.passport,
        travel: data.travel ?? prev.travel,
        embassy: data.embassy !== undefined ? data.embassy : prev.embassy,
        paymentStatus: data.paymentStatus ?? prev.paymentStatus,
        activity: data.activity ?? prev.activity,
      };
    });
  }

  async function saveApplicant() {
    if (!id) return;
    setCardSaving(true);
    setCardError('');
    try {
      const { data } = await apiFetch<ApplicationDetailType>(`/applications/${id}/applicant`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: applicantForm.fullName.trim(),
          dateOfBirth: applicantForm.dateOfBirth || null,
          sex: applicantForm.sex || null,
          nationality: applicantForm.nationality.trim().toUpperCase() || null,
          email: applicantForm.email.trim(),
        }),
      });
      mergeApplicationPatch(data);
      setEditingCard(null);
    } catch (err) {
      setCardError(err instanceof ApiError ? err.message : 'Failed to save applicant information');
    } finally {
      setCardSaving(false);
    }
  }

  async function savePassport() {
    if (!id) return;
    setCardSaving(true);
    setCardError('');
    try {
      const { data } = await apiFetch<ApplicationDetailType>(`/applications/${id}/passport`, {
        method: 'PATCH',
        body: JSON.stringify({
          passportNumber: passportForm.passportNumber.trim(),
          issuingCountry: passportForm.issuingCountry.trim().toUpperCase() || null,
          issueDate: passportForm.issueDate || null,
          expiryDate: passportForm.expiryDate || null,
        }),
      });
      mergeApplicationPatch(data);
      setEditingCard(null);
    } catch (err) {
      setCardError(err instanceof ApiError ? err.message : 'Failed to save passport information');
    } finally {
      setCardSaving(false);
    }
  }

  async function saveTravel() {
    if (!id) return;
    setCardSaving(true);
    setCardError('');
    try {
      const { data } = await apiFetch<ApplicationDetailType>(`/applications/${id}/travel`, {
        method: 'PATCH',
        body: JSON.stringify({
          purpose: travelForm.purpose.trim(),
          embassy: travelForm.embassy || null,
          entryDate: travelForm.entryDate || null,
          exitDate: travelForm.exitDate || null,
          addressInAfghanistan: travelForm.addressInAfghanistan.trim(),
          payment: travelForm.payment || null,
        }),
      });
      mergeApplicationPatch(data);
      setEditingCard(null);
    } catch (err) {
      setCardError(err instanceof ApiError ? err.message : 'Failed to save travel information');
    } finally {
      setCardSaving(false);
    }
  }

  async function onRequestDocs(e: FormEvent) {
    e.preventDefault();
    if (!docName.trim() || !id) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { data } = await requestDocuments(id, {
        documentName: docName.trim(),
        note: docNote.trim() || undefined,
      });
      setApp(data);
      setRequestOpen(false);
      setDocName('');
      setDocNote('');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Document request failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function onReject(e: FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim() || !id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await changeApplicationStatus(id, {
        toStatus: 'rejected',
        note: rejectReason.trim(),
      });
      const fresh = await getApplication(id);
      setApp(fresh.data);
      setRejectOpen(false);
      setRejectReason('');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Reject failed');
    } finally {
      setActionLoading(false);
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

  async function openIssueModal() {
    if (!id) return;
    setActionError('');
    setPreviewError('');
    setSendEmailOnIssue(true);
    setIssueOpen(true);
    setPreviewLoading(true);
    revokePreviewUrl();
    try {
      const preview = await previewVisaPdf(id);
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

  async function onSaveAndSendVisa(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      // Approve without auto-issue when still pending approval, then persist PDF + optional email.
      if (current.status !== 'approved' && current.status !== 'visa_issued') {
        await changeApplicationStatus(id, {
          toStatus: 'approved',
          note: 'Approved — issuing visa after preview',
          autoIssueVisa: false,
        });
      }

      await issueVisa({
        applicationId: id,
        sendEmail: sendEmailOnIssue,
        force: current.status === 'visa_issued',
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

  async function onDownloadDocument(documentId: string, fileName: string) {
    try {
      const { blob } = await downloadApplicationDocument(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Download failed');
    }
  }

  async function loadActiveEmbassies() {
    setEmbassyChoicesLoading(true);
    try {
      const { data } = await listEmbassies({ isActive: true, limit: 100 });
      setEmbassyChoices(data);
      if (data.length === 1) setSelectedEmbassyId(data[0]._id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to load embassies');
      setEmbassyChoices([]);
    } finally {
      setEmbassyChoicesLoading(false);
    }
  }

  function openSendToEmbassy() {
    setActionError('');
    setSendNote('Forwarded for consular review');
    if (assignedEmbassyId) {
      setConfirmSendOpen(true);
      return;
    }
    setSelectedEmbassyId('');
    setSendEmbassyOpen(true);
    void loadActiveEmbassies();
  }

  async function submitSendToEmbassy(embassyId: string, note?: string) {
    if (!id || !embassyId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await changeApplicationStatus(id, {
        toStatus: 'sent_to_embassy' as ApplicationStatus,
        embassy: embassyId,
        note: note?.trim() || 'Forwarded for consular review',
      });
      const fresh = await getApplication(id);
      setApp(fresh.data);
      setSendEmbassyOpen(false);
      setConfirmSendOpen(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to send to embassy');
    } finally {
      setActionLoading(false);
    }
  }

  async function onConfirmExistingEmbassy(e: FormEvent) {
    e.preventDefault();
    if (!assignedEmbassyId) return;
    await submitSendToEmbassy(assignedEmbassyId, sendNote);
  }

  async function onPickEmbassyAndSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedEmbassyId) {
      setActionError('Select an embassy before sending');
      return;
    }
    await submitSendToEmbassy(selectedEmbassyId, sendNote);
  }

  function copyId() {
    void navigator.clipboard.writeText(current.referenceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function onSendChat(e: FormEvent) {
    e.preventDefault();
    if (!id || !draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    setActionLoading(true);
    setActionError('');
    try {
      await addApplicationNote(id, text);
      const fresh = await getApplication(id);
      setApp(fresh.data);
    } catch (err) {
      setDraft(text);
      setActionError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setActionLoading(false);
    }
  }

  async function onSendEmbassyChat(e: FormEvent) {
    e.preventDefault();
    if (!embassyRoomId || !embassyDraft.trim()) return;
    setEmbassyChatSending(true);
    setEmbassyChatError('');
    try {
      await sendChatMessage(embassyRoomId, embassyDraft.trim());
      setEmbassyDraft('');
      const { data } = await listChatMessages(embassyRoomId, { limit: 100 });
      setEmbassyMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setEmbassyChatError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setEmbassyChatSending(false);
    }
  }

  const requested = current.requestedDocuments || [];
  const uploaded = current.documents || [];

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
          {canRequestDocs ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--amber"
              onClick={() => {
                setActionError('');
                setRequestOpen(true);
              }}
              disabled={actionLoading}
            >
              Request documents
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

          {canApprove || canIssueOnly ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--green"
              onClick={() => void openIssueModal()}
              disabled={actionLoading}
            >
              {canApprove ? 'Approve & issue visa' : 'Issue visa'}
            </button>
          ) : null}

          {canSendEmbassy ? (
            <button
              type="button"
              className="app-detail__btn app-detail__btn--green"
              onClick={openSendToEmbassy}
              disabled={actionLoading}
            >
              Send to embassy
            </button>
          ) : null}

          <button type="button" className="app-detail__icon-btn" aria-label="Download dossier">
            <Download size={18} strokeWidth={2} />
          </button>

          {canDelete ? (
            <button
              type="button"
              className="app-detail__icon-btn app-detail__icon-btn--danger"
              aria-label="Delete application"
              title="Delete application"
              onClick={() => setDeleteOpen(true)}
              disabled={actionLoading}
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </header>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete application"
        message={
          <>
            You are about to permanently delete <strong>{current.referenceId}</strong> along with
            all its documents, payments, chats, and issued visa. This cannot be undone.
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
        {actionError && !requestOpen && !rejectOpen && !sendEmbassyOpen && !confirmSendOpen ? (
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
                  {app.visaTypeCode} · Submitted {formatDate(app.submittedAt || app.createdAt)}
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
                      {(doc.category || 'upload').replaceAll('_', ' ')} · {formatDate(doc.createdAt)}
                      {doc.key === 'issued_visa' && current.issuedVisa?.visaNumber
                        ? ` · ${current.issuedVisa.visaNumber}`
                        : ''}
                    </span>
                  </div>
                  <div className="app-detail__doc-actions">
                    <button
                      type="button"
                      className="app-detail__doc-dl"
                      onClick={() =>
                        void onDownloadDocument(
                          doc._id,
                          doc.originalName || `${doc.label || 'document'}.pdf`
                        )
                      }
                    >
                      <Download size={14} />
                      {doc.mimeType?.startsWith('image/') ? 'View' : 'Download'}
                    </button>
                  </div>
                </div>
              ))}

              {current.issuedVisa?.visaNumber &&
              !uploaded.some((d) => d.key === 'issued_visa') ? (
                <div className="app-detail__doc-row">
                  <div>
                    <strong>Issued Visa</strong>
                    <span>visa document · {current.issuedVisa.visaNumber}</span>
                  </div>
                  <span className="app-detail__req-status app-detail__req-status--uploaded">
                    Issued
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="info-card app-detail__chat">
            <div className="app-detail__chat-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={chatTab === 'applicant'}
                className={chatTab === 'applicant' ? 'is-active' : undefined}
                onClick={() => setChatTab('applicant')}
              >
                Chat with applicant
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chatTab === 'embassy'}
                className={chatTab === 'embassy' ? 'is-active' : undefined}
                onClick={() => setChatTab('embassy')}
              >
                Chat with embassy
              </button>
            </div>

            {chatTab === 'applicant' ? (
              <>
                <div className="app-detail__messages">
                  {(app.activity || [])
                    .filter((a) => a.note)
                    .slice(-40)
                    .map((msg, idx) => {
                      // Sender (staff) right · receiver (applicant) left
                      const fromStaff =
                        msg.actorType === 'staff' ||
                        msg.action === 'note' ||
                        msg.actorType === 'system';
                      const fromApplicant = msg.actorType === 'applicant';
                      const side = fromStaff || !fromApplicant ? 'is-out' : 'is-in';
                      return (
                        <div
                          key={`${msg.at}-${idx}`}
                          className={`app-detail__bubble ${side}`}
                        >
                          <p>{msg.note}</p>
                          <span>
                            {msg.actorName || msg.action} · {formatDate(msg.at)}
                          </span>
                        </div>
                      );
                    })}
                  {!(app.activity || []).some((a) => a.note) ? (
                    <div className="app-detail__bubble is-in">
                      <p>No messages yet. Send a note to the applicant — they will get a notification.</p>
                      <span>System</span>
                    </div>
                  ) : null}
                </div>

                <form className="app-detail__composer" onSubmit={(e) => void onSendChat(e)}>
                  <input
                    type="text"
                    placeholder="Message the applicant…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={actionLoading}
                  />
                  <button type="submit" disabled={actionLoading || !draft.trim()}>
                    <Send size={16} />
                    Send
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="app-detail__chat-toolbar">
                  {embassyRoomId ? (
                    <Link className="app-detail__open-chat" to={`/chat?room=${embassyRoomId}`}>
                      <ExternalLink size={14} />
                      Open in Chat
                    </Link>
                  ) : assignedEmbassyId ? (
                    <Link
                      className="app-detail__open-chat"
                      to={`/chat?application=${id}&embassy=${assignedEmbassyId}`}
                    >
                      <ExternalLink size={14} />
                      Open in Chat
                    </Link>
                  ) : null}
                </div>

                {!assignedEmbassyId ? (
                  <div className="app-detail__messages">
                    <div className="app-detail__bubble is-in">
                      <p>Assign / send to an embassy first to start embassy chat.</p>
                      <span>System</span>
                    </div>
                  </div>
                ) : !canChat ? (
                  <div className="app-detail__messages">
                    <div className="app-detail__bubble is-in">
                      <p>You need chat:access permission to use embassy chat.</p>
                      <span>System</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {embassyChatError ? (
                      <div className="app-detail__alert app-detail__alert--error">{embassyChatError}</div>
                    ) : null}
                    <div className="app-detail__messages" ref={embassyMessagesRef}>
                      {embassyChatLoading && !embassyMessages.length ? (
                        <p className="app-detail__muted">Loading embassy chat…</p>
                      ) : null}
                      {!embassyChatLoading && embassyMessages.length === 0 ? (
                        <div className="app-detail__bubble is-in">
                          <p>No messages yet. Start the embassy thread.</p>
                          <span>System</span>
                        </div>
                      ) : null}
                      {embassyMessages.map((msg) => {
                        const mine =
                          msg.senderType === 'staff' && String(msg.senderId) === String(staffId);
                        return (
                          <div
                            key={msg._id}
                            className={`app-detail__bubble ${mine ? 'is-out' : 'is-in'}`}
                          >
                            <p>{msg.body}</p>
                            <span>
                              {mine ? 'You' : msg.senderName} · {formatChatTime(msg.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <form
                      className="app-detail__composer"
                      onSubmit={(e) => void onSendEmbassyChat(e)}
                    >
                      <input
                        type="text"
                        placeholder="Message the embassy…"
                        value={embassyDraft}
                        onChange={(e) => setEmbassyDraft(e.target.value)}
                        disabled={embassyChatSending || !embassyRoomId}
                      />
                      <button
                        type="submit"
                        disabled={embassyChatSending || !embassyDraft.trim() || !embassyRoomId}
                      >
                        <Send size={16} />
                        {embassyChatSending ? 'Sending…' : 'Send'}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}
          </section>
        </div>

        <div className="app-detail__bottom">
          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--teal">
                <UserRound size={16} />
              </span>
              <h3>Applicant information</h3>
              <div className="info-card__actions">
                {editingCard === 'applicant' ? (
                  <>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--ghost"
                      onClick={cancelCardEdit}
                      disabled={cardSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--primary"
                      onClick={() => void saveApplicant()}
                      disabled={cardSaving}
                    >
                      {cardSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="info-card__btn info-card__btn--ghost"
                    onClick={startEditApplicant}
                    disabled={editingCard !== null}
                  >
                    Edit
                  </button>
                )}
              </div>
            </header>
            {editingCard === 'applicant' && cardError ? (
              <div className="info-card__error">{cardError}</div>
            ) : null}
            {editingCard === 'applicant' ? (
              <dl className="info-card__grid">
                <div>
                  <dt>Full name</dt>
                  <dd>
                    <input
                      value={applicantForm.fullName}
                      onChange={(e) =>
                        setApplicantForm((f) => ({ ...f, fullName: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>
                    <input
                      type="date"
                      value={applicantForm.dateOfBirth}
                      onChange={(e) =>
                        setApplicantForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Age</dt>
                  <dd>{calcAge(applicantForm.dateOfBirth) ?? '—'}</dd>
                </div>
                <div>
                  <dt>Sex</dt>
                  <dd>
                    <select
                      value={applicantForm.sex}
                      onChange={(e) => setApplicantForm((f) => ({ ...f, sex: e.target.value }))}
                    >
                      <option value="">—</option>
                      <option value="male">male</option>
                      <option value="female">female</option>
                      <option value="other">other</option>
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Nationality</dt>
                  <dd>
                    <input
                      maxLength={3}
                      placeholder="e.g. GB"
                      value={applicantForm.nationality}
                      onChange={(e) =>
                        setApplicantForm((f) => ({
                          ...f,
                          nationality: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <input
                      type="email"
                      value={applicantForm.email}
                      onChange={(e) =>
                        setApplicantForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </dd>
                </div>
              </dl>
            ) : (
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
            )}
          </section>

          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--gold">
                <Shield size={16} />
              </span>
              <h3>Passport information</h3>
              <div className="info-card__actions">
                {editingCard === 'passport' ? (
                  <>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--ghost"
                      onClick={cancelCardEdit}
                      disabled={cardSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--primary"
                      onClick={() => void savePassport()}
                      disabled={cardSaving}
                    >
                      {cardSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="info-card__btn info-card__btn--ghost"
                    onClick={startEditPassport}
                    disabled={editingCard !== null}
                  >
                    Edit
                  </button>
                )}
              </div>
            </header>
            {editingCard === 'passport' && cardError ? (
              <div className="info-card__error">{cardError}</div>
            ) : null}
            {editingCard === 'passport' ? (
              <dl className="info-card__grid">
                <div>
                  <dt>Passport number</dt>
                  <dd>
                    <input
                      value={passportForm.passportNumber}
                      onChange={(e) =>
                        setPassportForm((f) => ({ ...f, passportNumber: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Issuing country</dt>
                  <dd>
                    <input
                      maxLength={3}
                      placeholder="e.g. IN"
                      value={passportForm.issuingCountry}
                      onChange={(e) =>
                        setPassportForm((f) => ({
                          ...f,
                          issuingCountry: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Issue date</dt>
                  <dd>
                    <input
                      type="date"
                      value={passportForm.issueDate}
                      onChange={(e) =>
                        setPassportForm((f) => ({ ...f, issueDate: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Expiry date</dt>
                  <dd>
                    <input
                      type="date"
                      value={passportForm.expiryDate}
                      onChange={(e) =>
                        setPassportForm((f) => ({ ...f, expiryDate: e.target.value }))
                      }
                    />
                  </dd>
                </div>
              </dl>
            ) : (
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
            )}
          </section>

          <section className="info-card">
            <header className="info-card__head">
              <span className="info-card__icon info-card__icon--blue">
                <Plane size={16} />
              </span>
              <h3>Travel & embassy</h3>
              <div className="info-card__actions">
                {editingCard === 'travel' ? (
                  <>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--ghost"
                      onClick={cancelCardEdit}
                      disabled={cardSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="info-card__btn info-card__btn--primary"
                      onClick={() => void saveTravel()}
                      disabled={cardSaving}
                    >
                      {cardSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="info-card__btn info-card__btn--ghost"
                    onClick={() => void startEditTravel()}
                    disabled={editingCard !== null}
                  >
                    Edit
                  </button>
                )}
              </div>
            </header>
            {editingCard === 'travel' && cardError ? (
              <div className="info-card__error">{cardError}</div>
            ) : null}
            {editingCard === 'travel' ? (
              <dl className="info-card__grid">
                <div>
                  <dt>Purpose</dt>
                  <dd>
                    <input
                      value={travelForm.purpose}
                      onChange={(e) =>
                        setTravelForm((f) => ({ ...f, purpose: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Embassy</dt>
                  <dd>
                    <select
                      value={travelForm.embassy}
                      onChange={(e) =>
                        setTravelForm((f) => ({ ...f, embassy: e.target.value }))
                      }
                      disabled={embassyChoicesLoading}
                    >
                      <option value="">
                        {embassyChoicesLoading ? 'Loading embassies…' : '—'}
                      </option>
                      {travelForm.embassy &&
                      !embassyChoices.some((e) => e._id === travelForm.embassy) ? (
                        <option value={travelForm.embassy}>
                          {embassyLabel(app.embassy)}
                        </option>
                      ) : null}
                      {embassyChoices.map((emb) => (
                        <option key={emb._id} value={emb._id}>
                          {emb.name}
                          {emb.code ? ` (${emb.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Entry date</dt>
                  <dd>
                    <input
                      type="date"
                      value={travelForm.entryDate}
                      onChange={(e) =>
                        setTravelForm((f) => ({ ...f, entryDate: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Exit date</dt>
                  <dd>
                    <input
                      type="date"
                      value={travelForm.exitDate}
                      onChange={(e) =>
                        setTravelForm((f) => ({ ...f, exitDate: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div className="info-card__span">
                  <dt>Address in Afghanistan</dt>
                  <dd>
                    <input
                      value={travelForm.addressInAfghanistan}
                      onChange={(e) =>
                        setTravelForm((f) => ({
                          ...f,
                          addressInAfghanistan: e.target.value,
                        }))
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>
                    <select
                      value={travelForm.payment}
                      onChange={(e) =>
                        setTravelForm((f) => ({ ...f, payment: e.target.value }))
                      }
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="info-card__grid">
                <div>
                  <dt>Purpose</dt>
                  <dd>{app.travel?.purpose || '—'}</dd>
                </div>
                <div>
                  <dt>Embassy</dt>
                  <dd>
                    <span className="app-detail__embassy">
                      <Building2 size={14} />
                      {embassyLabel(app.embassy)}
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
            )}
          </section>
        </div>
      </div>

      <Modal open={requestOpen} title="Request document" onClose={() => setRequestOpen(false)}>
        <form className="modal-form" onSubmit={(e) => void onRequestDocs(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}
          <label>
            Document name
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Proof of accommodation"
              required
              autoFocus
            />
          </label>
          <label>
            Note to applicant (optional)
            <textarea
              value={docNote}
              onChange={(e) => setDocNote(e.target.value)}
              placeholder="Explain what is missing…"
            />
          </label>
          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={() => setRequestOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="is-primary" disabled={actionLoading || !docName.trim()}>
              {actionLoading ? 'Sending…' : 'Send request'}
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
        title={canApprove ? 'Approve & issue visa' : 'Issue visa'}
        onClose={closeIssueModal}
        className="modal--visa-preview"
      >
        <form className="modal-form visa-issue-preview" onSubmit={(e) => void onSaveAndSendVisa(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}

          <p className="visa-issue-preview__meta">
            Preview the PDF first. Saving stores it on the application document panel
            {sendEmailOnIssue ? ' and emails the applicant' : ''}.
          </p>

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
              Send issued visa PDF notification to the applicant
              {previewMeta?.applicantEmail ? ` (${previewMeta.applicantEmail})` : ''}
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
                  ? 'Save & send'
                  : 'Save to documents'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmSendOpen}
        title="Send to embassy"
        onClose={() => setConfirmSendOpen(false)}
      >
        <form className="modal-form" onSubmit={(e) => void onConfirmExistingEmbassy(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)' }}>
            Forward this application to <strong>{embassyLabel(current.embassy)}</strong>?
          </p>
          <label>
            Note (optional)
            <textarea value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          </label>
          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={() => setConfirmSendOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="is-primary" disabled={actionLoading}>
              {actionLoading ? 'Sending…' : 'Confirm send'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={sendEmbassyOpen}
        title="Send to embassy"
        onClose={() => setSendEmbassyOpen(false)}
      >
        <form className="modal-form" onSubmit={(e) => void onPickEmbassyAndSend(e)}>
          {actionError ? <div className="modal-form__error">{actionError}</div> : null}
          <label>
            Embassy
            <select
              value={selectedEmbassyId}
              onChange={(e) => setSelectedEmbassyId(e.target.value)}
              required
              disabled={embassyChoicesLoading || actionLoading}
              autoFocus
            >
              <option value="">
                {embassyChoicesLoading ? 'Loading embassies…' : 'Select an embassy'}
              </option>
              {embassyChoices.map((emb) => (
                <option key={emb._id} value={emb._id}>
                  {emb.name} ({emb.code})
                </option>
              ))}
            </select>
          </label>
          {!embassyChoicesLoading && embassyChoices.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
              No active embassies available. Create one under Embassies first.
            </p>
          ) : null}
          <label>
            Note (optional)
            <textarea value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          </label>
          <div className="modal-form__actions">
            <button type="button" className="is-ghost" onClick={() => setSendEmbassyOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="is-primary"
              disabled={actionLoading || !selectedEmbassyId || embassyChoicesLoading}
            >
              {actionLoading ? 'Sending…' : 'Send to embassy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
