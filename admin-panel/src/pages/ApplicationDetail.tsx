import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Building2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Plane,
  Send,
  Shield,
  UserRound,
} from 'lucide-react';
import {
  changeApplicationStatus,
  embassyLabel,
  formatDate,
  getApplication,
  requestDocuments,
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
import { ApiError, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { Modal } from '../components/Modal';
import './ApplicationDetail.css';

const POLL_MS = 5000;
const CHAT_POLL_MS = 4000;

function embassyIdOf(embassy: ApplicationDetailType['embassy']): string | null {
  if (!embassy) return null;
  if (typeof embassy === 'string') return embassy;
  return embassy._id || null;
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { staff } = useAuth();
  const canChat = staffHasPermission(staff, 'chat:access');
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
  const [sendEmbassyOpen, setSendEmbassyOpen] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docNote, setDocNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
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
  const canSendEmbassy = current.allowedNextStatuses?.includes('sent_to_embassy');
  const assignedEmbassyId = embassyIdOf(current.embassy);

  const age = current.personal?.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(current.personal.dateOfBirth).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

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

  function onSendChat(e: FormEvent) {
    e.preventDefault();
    setDraft('');
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
        </div>
      </header>

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
                      {doc.category.replaceAll('_', ' ')} · {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  <span className="app-detail__req-status app-detail__req-status--received">Received</span>
                </div>
              ))}
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
                    .slice(-6)
                    .map((msg, idx) => (
                      <div
                        key={`${msg.at}-${idx}`}
                        className={`app-detail__bubble ${msg.actorName === 'You' ? 'is-out' : 'is-in'}`}
                      >
                        <p>{msg.note}</p>
                        <span>
                          {msg.actorName || msg.action} · {formatDate(msg.at)}
                        </span>
                      </div>
                    ))}
                  {!(app.activity || []).length ? (
                    <div className="app-detail__bubble is-in">
                      <p>Applicant chat is coming soon. Showing recent activity notes for now.</p>
                      <span>System</span>
                    </div>
                  ) : null}
                </div>

                <form className="app-detail__composer" onSubmit={onSendChat}>
                  <input
                    type="text"
                    placeholder="Applicant chat coming soon…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled
                  />
                  <button type="submit" disabled>
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
              <span className="info-card__icon info-card__icon--blue">
                <Plane size={16} />
              </span>
              <h3>Travel & embassy</h3>
            </header>
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
