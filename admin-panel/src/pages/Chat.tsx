import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Building2, FileText, MessagesSquare, Paperclip, Send, X } from 'lucide-react';
import { useAuth } from '../api/AuthContext';
import { ApiError, staffHasPermission } from '../api/client';
import { listEmbassies, type Embassy } from '../api/embassies';
import {
  ensureApplicationRoom,
  formatChatTime,
  listChatMessages,
  listChatRooms,
  roomLabel,
  roomSubtitle,
  sendChatMessage,
  type ChatMessage,
  type ChatRoom,
} from '../api/chat';
import { clearRoomUnread } from '../layout/unreadStore';
import './Chat.css';

const ROOMS_POLL_MS = 12000;
const MESSAGES_POLL_MS = 4000;

export function Chat() {
  const { staff } = useAuth();
  const canChat = staffHasPermission(staff, 'chat:access');
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get('room');
  const applicationFromUrl = searchParams.get('application');
  const embassyFromUrl = searchParams.get('embassy');

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [embassies, setEmbassies] = useState<Embassy[]>([]);
  const [embassyFilter, setEmbassyFilter] = useState(embassyFromUrl || '');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomFromUrl);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'general' | 'application'>('all');

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const staffId = staff?.id || '';

  const loadRooms = useCallback(async () => {
    if (!canChat) {
      setRoomsLoading(false);
      return;
    }
    try {
      const { data } = await listChatRooms({
        embassy: embassyFilter || undefined,
      });
      setRooms(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load chat rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, [canChat, embassyFilter]);

  const loadMessages = useCallback(async (roomId: string, quiet = false) => {
    if (!quiet) setMessagesLoading(true);
    try {
      const { data } = await listChatMessages(roomId, { limit: 100 });
      setMessages(Array.isArray(data) ? data : []);
      setRooms((prev) => {
        const room = prev.find((r) => r._id === roomId);
        if (room) clearRoomUnread(room);
        return prev.map((r) => (r._id === roomId ? { ...r, unreadCount: 0 } : r));
      });
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages');
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canChat) return;
    void (async () => {
      try {
        const { data } = await listEmbassies({ isActive: true, limit: 100 });
        setEmbassies(data);
      } catch {
        setEmbassies([]);
      }
    })();
  }, [canChat]);

  useEffect(() => {
    setRoomsLoading(true);
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!canChat) return;
    const id = window.setInterval(() => void loadRooms(), ROOMS_POLL_MS);
    return () => window.clearInterval(id);
  }, [canChat, loadRooms]);

  useEffect(() => {
    if (!canChat || !applicationFromUrl || !embassyFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await ensureApplicationRoom({
          embassyId: embassyFromUrl,
          applicationId: applicationFromUrl,
          title: `Case chat — ${applicationFromUrl}`,
        });
        if (cancelled || !data?._id) return;
        await loadRooms();
        setActiveRoomId(data._id);
        setSearchParams({ room: data._id }, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to open case chat');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canChat, applicationFromUrl, embassyFromUrl, loadRooms, setSearchParams]);

  useEffect(() => {
    if (roomFromUrl) {
      setActiveRoomId((prev) => (prev === roomFromUrl ? prev : roomFromUrl));
    }
  }, [roomFromUrl]);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeRoomId);
    const id = window.setInterval(() => void loadMessages(activeRoomId, true), MESSAGES_POLL_MS);
    return () => window.clearInterval(id);
  }, [activeRoomId, loadMessages]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, activeRoomId]);

  const filteredRooms = useMemo(() => {
    if (filter === 'all') return rooms;
    return rooms.filter((r) => r.type === filter);
  }, [rooms, filter]);

  const activeRoom = useMemo(() => {
    const found = rooms.find((r) => r._id === activeRoomId);
    if (found) return found;
    if (!activeRoomId) return null;
    return { _id: activeRoomId, title: 'Conversation', type: 'general' as const };
  }, [rooms, activeRoomId]);

  function selectRoom(room: ChatRoom) {
    setActiveRoomId(room._id);
    setSearchParams({ room: room._id }, { replace: true });
    setFiles([]);
    setDraft('');
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!activeRoomId || (!draft.trim() && files.length === 0)) return;
    setSending(true);
    setError('');
    try {
      const body = draft.trim() || (files.length ? '(attachment)' : '');
      await sendChatMessage(activeRoomId, body, files);
      setDraft('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([loadMessages(activeRoomId, true), loadRooms()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const caseAppId =
    activeRoom && typeof activeRoom.application === 'object' && activeRoom.application
      ? activeRoom.application._id
      : null;

  if (!canChat) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-chat">
      <header className="admin-chat__page-head">
        <h1>Chat</h1>
        <p>Coordinate with embassies</p>
      </header>

      <aside className="admin-chat__rooms">
        <div className="admin-chat__embassy-filter">
          <label>
            Embassy
            <select
              value={embassyFilter}
              onChange={(e) => {
                setEmbassyFilter(e.target.value);
                setRoomsLoading(true);
              }}
              aria-label="Filter by embassy"
            >
              <option value="">All embassies</option>
              {embassies.map((emb) => (
                <option key={emb._id} value={emb._id}>
                  {emb.name} ({emb.code})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-chat__filters" role="tablist" aria-label="Room filter">
          {(
            [
              ['all', 'All'],
              ['general', 'General'],
              ['application', 'Cases'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? 'is-active' : undefined}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="admin-chat__room-list">
          {roomsLoading && !rooms.length ? <p className="admin-chat__empty">Loading rooms…</p> : null}
          {!roomsLoading && filteredRooms.length === 0 ? (
            <p className="admin-chat__empty">
              No rooms yet. Open a case chat from an application, or create an embassy (general
              channel is created automatically).
            </p>
          ) : null}

          {filteredRooms.map((room) => {
            const active = room._id === activeRoomId;
            const unread = room.unreadCount || 0;
            const Icon = room.type === 'general' ? Building2 : FileText;
            return (
              <button
                key={room._id}
                type="button"
                className={`admin-chat__room${active ? ' is-active' : ''}${unread > 0 ? ' has-unread' : ''}`}
                onClick={() => selectRoom(room)}
              >
                <span className="admin-chat__room-icon" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="admin-chat__room-meta">
                  <strong>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        maxWidth: '100%',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {roomLabel(room)}
                      </span>
                      {unread > 0 ? (
                        <span className="admin-chat__unread" aria-label={`${unread} unread`}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null}
                    </span>
                  </strong>
                  <span>{roomSubtitle(room)}</span>
                </span>
                <time>{formatChatTime(room.lastMessageAt || room.updatedAt)}</time>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="admin-chat__thread">
        {error ? <div className="admin-chat__banner">{error}</div> : null}

        {!activeRoomId ? (
          <div className="admin-chat__blank">
            <MessagesSquare size={36} strokeWidth={1.5} />
            <h2>Select a conversation</h2>
            <p>General mission channels or case rooms across embassies.</p>
          </div>
        ) : (
          <>
            <header className="admin-chat__thread-head">
              <div>
                <h2>{activeRoom ? roomLabel(activeRoom) : 'Conversation'}</h2>
                <p>{activeRoom ? roomSubtitle(activeRoom) : 'Loading…'}</p>
              </div>
              {caseAppId ? (
                <Link className="admin-chat__case" to={`/applications/${caseAppId}`}>
                  Open case
                </Link>
              ) : null}
            </header>

            <div className="admin-chat__messages" ref={messagesRef}>
              {messagesLoading && !messages.length ? (
                <p className="admin-chat__hint">Loading messages…</p>
              ) : null}
              {!messagesLoading && messages.length === 0 ? (
                <p className="admin-chat__hint">No messages yet. Say hello to start the thread.</p>
              ) : null}

              {messages.map((msg) => {
                const mine =
                  msg.senderType === 'staff' && String(msg.senderId) === String(staffId);
                const fromEmbassy = msg.senderType === 'embassy_staff';
                return (
                  <article
                    key={msg._id}
                    className={`admin-chat__bubble${mine ? ' is-mine' : ''}${
                      fromEmbassy ? ' is-embassy' : ''
                    }`}
                  >
                    <header>
                      <strong>{mine ? 'You' : msg.senderName}</strong>
                      <span>
                        {msg.senderType === 'staff'
                          ? 'Admin'
                          : msg.senderType === 'embassy_staff'
                            ? 'Embassy'
                            : 'System'}{' '}
                        · {formatChatTime(msg.createdAt)}
                      </span>
                    </header>
                    <p>{msg.body}</p>
                    {msg.attachments?.length ? (
                      <ul>
                        {msg.attachments.map((a, i) => (
                          <li key={`${a.originalName}-${i}`}>
                            <Paperclip size={12} />
                            {a.originalName || 'Attachment'}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {files.length ? (
              <div className="admin-chat__pending">
                {files.map((f) => (
                  <span key={`${f.name}-${f.size}`}>
                    {f.name}
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <form className="admin-chat__composer" onSubmit={(e) => void onSend(e)}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const next = Array.from(e.target.files || []).slice(0, 5);
                  setFiles(next);
                }}
              />
              <button
                type="button"
                aria-label="Attach files"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                placeholder="Write a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sending}
              />
              <button type="submit" disabled={sending || (!draft.trim() && !files.length)}>
                <Send size={16} />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
