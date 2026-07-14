import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, FileText, MessagesSquare, Paperclip, Send, X } from 'lucide-react';
import { useAuth } from '../api/AuthContext';
import { ApiError } from '../api/client';
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
import './Chat.css';

const ROOMS_POLL_MS = 12000;
const MESSAGES_POLL_MS = 4000;

export function Chat() {
  const { staff } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get('room');
  const applicationFromUrl = searchParams.get('application');

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomFromUrl);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'general' | 'application'>('all');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const staffId = staff?._id || staff?.id || '';

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await listChatRooms();
      setRooms(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load chat rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: string, quiet = false) => {
    if (!quiet) setMessagesLoading(true);
    try {
      const { data } = await listChatMessages(roomId, { limit: 100 });
      setMessages(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages');
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    const id = window.setInterval(() => void loadRooms(), ROOMS_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadRooms]);

  useEffect(() => {
    if (!applicationFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await ensureApplicationRoom(
          applicationFromUrl,
          `Case chat — ${applicationFromUrl}`
        );
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
  }, [applicationFromUrl, loadRooms, setSearchParams]);

  useEffect(() => {
    if (roomFromUrl) {
      setActiveRoomId((prev) => (prev === roomFromUrl ? prev : roomFromUrl));
      return;
    }
    if (!activeRoomId && rooms.length > 0 && !applicationFromUrl) {
      const preferred = rooms.find((r) => r.type === 'general') || rooms[0];
      setActiveRoomId(preferred._id);
      setSearchParams({ room: preferred._id }, { replace: true });
    }
  }, [roomFromUrl, rooms, activeRoomId, applicationFromUrl, setSearchParams]);

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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  return (
    <div className="chat">
      <header className="chat__page-head">
        <div>
          <h1>Chat</h1>
          <p>Coordinate with Raizing Global</p>
        </div>
      </header>

      <div className="chat__body">
        <aside className="chat__rooms">
          <div className="chat__filters" role="tablist" aria-label="Room filter">
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

          <div className="chat__room-list">
            {roomsLoading && !rooms.length ? <p className="chat__empty">Loading rooms…</p> : null}
            {!roomsLoading && filteredRooms.length === 0 ? (
              <p className="chat__empty">No rooms yet. Open a case chat from an application.</p>
            ) : null}

            {filteredRooms.map((room) => {
              const active = room._id === activeRoomId;
              const Icon = room.type === 'general' ? Building2 : FileText;
              return (
                <button
                  key={room._id}
                  type="button"
                  className={`chat__room${active ? ' is-active' : ''}`}
                  onClick={() => selectRoom(room)}
                >
                  <span className="chat__room-icon" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <span className="chat__room-meta">
                    <strong>{roomLabel(room)}</strong>
                    <span>{roomSubtitle(room)}</span>
                  </span>
                  <time>{formatChatTime(room.lastMessageAt || room.updatedAt)}</time>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="chat__thread">
          {error ? <div className="chat__banner">{error}</div> : null}

          {!activeRoomId ? (
            <div className="chat__blank">
              <MessagesSquare size={36} strokeWidth={1.5} />
              <h2>Select a conversation</h2>
              <p>General mission chat or a case room with Raizing Global.</p>
            </div>
          ) : (
            <>
              <header className="chat__thread-head">
                <div>
                  <h2>{activeRoom ? roomLabel(activeRoom) : 'Conversation'}</h2>
                  <p>{activeRoom ? roomSubtitle(activeRoom) : 'Loading…'}</p>
                </div>
                {caseAppId ? (
                  <Link className="chat__case" to={`/applications/${caseAppId}`}>
                    Open case
                  </Link>
                ) : null}
              </header>

              <div className="chat__messages">
                {messagesLoading && !messages.length ? (
                  <p className="chat__hint">Loading messages…</p>
                ) : null}
                {!messagesLoading && messages.length === 0 ? (
                  <p className="chat__hint">No messages yet. Say hello to start the thread.</p>
                ) : null}

                {messages.map((msg) => {
                  const mine =
                    msg.senderType === 'embassy_staff' && String(msg.senderId) === String(staffId);
                  const fromAdmin = msg.senderType === 'staff';
                  return (
                    <article
                      key={msg._id}
                      className={`chat__bubble${mine ? ' is-mine' : ''}${fromAdmin ? ' is-admin' : ''}`}
                    >
                      <header>
                        <strong>{mine ? 'You' : msg.senderName}</strong>
                        <span>
                          {msg.senderType === 'staff'
                            ? 'Raizing Global'
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
                <div ref={bottomRef} />
              </div>

              {files.length ? (
                <div className="chat__pending">
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

              <form className="chat__composer" onSubmit={(e) => void onSend(e)}>
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
    </div>
  );
}
