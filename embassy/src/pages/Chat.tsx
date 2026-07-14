import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Check,
  CheckCheck,
  FileText,
  MessagesSquare,
  Paperclip,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../api/AuthContext';
import { ApiError } from '../api/client';
import {
  ensureApplicationRoom,
  ensureInterEmbassyRoom,
  formatChatTime,
  listChatMessages,
  listChatRooms,
  listPeerEmbassies,
  messageIsSeen,
  peerForRoom,
  roomLabel,
  roomSubtitle,
  sendChatMessage,
  type ChatMessage,
  type ChatRoom,
  type PeerEmbassy,
} from '../api/chat';
import './Chat.css';

const ROOMS_POLL_MS = 12000;
const MESSAGES_POLL_MS = 4000;

type RoomFilter = 'all' | 'general' | 'application' | 'inter_embassy';

export function Chat() {
  const { staff, embassy } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get('room');
  const applicationFromUrl = searchParams.get('application');
  const peerFromUrl = searchParams.get('peerEmbassy');

  const myEmbassyId = embassy?._id || embassy?.id || '';

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [peers, setPeers] = useState<PeerEmbassy[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomFromUrl);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [peerQuery, setPeerQuery] = useState('');
  const [peersLoading, setPeersLoading] = useState(false);
  const [openingPeer, setOpeningPeer] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('all');

  const messagesRef = useRef<HTMLDivElement | null>(null);
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
      // markRead defaults true — opens thread as seen for the peer's receipts
      const { data } = await listChatMessages(roomId, { limit: 100 });
      setMessages(Array.isArray(data) ? data : []);
      setRooms((prev) =>
        prev.map((r) => (r._id === roomId ? { ...r, unreadCount: 0 } : r))
      );
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages');
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }, []);

  const openPeerPicker = useCallback(async () => {
    setPickerOpen(true);
    setPeerQuery('');
    setPeersLoading(true);
    try {
      const { data } = await listPeerEmbassies();
      setPeers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load embassies');
      setPeers([]);
    } finally {
      setPeersLoading(false);
    }
  }, []);

  const startChatWithPeer = useCallback(
    async (peer: PeerEmbassy) => {
      setOpeningPeer(peer._id);
      setError('');
      try {
        const { data } = await ensureInterEmbassyRoom(peer._id);
        if (!data?._id) throw new Error('Room not created');
        await loadRooms();
        setActiveRoomId(data._id);
        setFilter('inter_embassy');
        setSearchParams({ room: data._id }, { replace: true });
        setPickerOpen(false);
        setFiles([]);
        setDraft('');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to open embassy chat');
      } finally {
        setOpeningPeer(null);
      }
    },
    [loadRooms, setSearchParams]
  );

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
    if (!peerFromUrl || applicationFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await ensureInterEmbassyRoom(peerFromUrl);
        if (cancelled || !data?._id) return;
        await loadRooms();
        setActiveRoomId(data._id);
        setFilter('inter_embassy');
        setSearchParams({ room: data._id }, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to open embassy chat');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerFromUrl, applicationFromUrl, loadRooms, setSearchParams]);

  useEffect(() => {
    if (roomFromUrl) {
      setActiveRoomId((prev) => (prev === roomFromUrl ? prev : roomFromUrl));
      return;
    }
    if (!activeRoomId && rooms.length > 0 && !applicationFromUrl && !peerFromUrl) {
      const preferred = rooms.find((r) => r.type === 'general') || rooms[0];
      setActiveRoomId(preferred._id);
      setSearchParams({ room: preferred._id }, { replace: true });
    }
  }, [roomFromUrl, rooms, activeRoomId, applicationFromUrl, peerFromUrl, setSearchParams]);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeRoomId);
    const id = window.setInterval(() => void loadMessages(activeRoomId, true), MESSAGES_POLL_MS);
    return () => window.clearInterval(id);
  }, [activeRoomId, loadMessages]);

  // Scroll only the messages pane — never scrollIntoView (that scrolls the whole page).
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, activeRoomId]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  const filteredRooms = useMemo(() => {
    if (filter === 'all') return rooms;
    return rooms.filter((r) => r.type === filter);
  }, [rooms, filter]);

  const filteredPeers = useMemo(() => {
    const q = peerQuery.trim().toLowerCase();
    if (!q) return peers;
    return peers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [peers, peerQuery]);

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

  const activePeer =
    activeRoom?.type === 'inter_embassy' ? peerForRoom(activeRoom, myEmbassyId) : null;

  return (
    <div className="chat">
      <header className="chat__head">
        <div>
          <h1>Chat</h1>
          <p>Raizing Global and other embassies</p>
        </div>
        <button type="button" className="chat__peer-cta" onClick={() => void openPeerPicker()}>
          <Users size={16} />
          Chat with embassy
        </button>
      </header>

      <aside className="chat__rooms">
        <div className="chat__filters" role="tablist" aria-label="Room filter">
          {(
            [
              ['all', 'All'],
              ['general', 'Raizing'],
              ['application', 'Cases'],
              ['inter_embassy', 'Embassies'],
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
            <p className="chat__empty">
              {filter === 'inter_embassy'
                ? 'No mission chats yet. Use Chat with embassy to coordinate.'
                : 'No rooms yet. Open a case chat from an application, or chat with another embassy.'}
            </p>
          ) : null}

          {filteredRooms.map((room) => {
            const active = room._id === activeRoomId;
            const unread = room.unreadCount || 0;
            const Icon =
              room.type === 'general' ? Building2 : room.type === 'inter_embassy' ? Users : FileText;
            return (
              <button
                key={room._id}
                type="button"
                className={`chat__room${active ? ' is-active' : ''}${unread > 0 ? ' has-unread' : ''}`}
                onClick={() => selectRoom(room)}
              >
                <span className="chat__room-icon" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="chat__room-meta">
                  <strong>{roomLabel(room, myEmbassyId)}</strong>
                  <span>{roomSubtitle(room, myEmbassyId)}</span>
                </span>
                <span className="chat__room-aside">
                  <time>{formatChatTime(room.lastMessageAt || room.updatedAt)}</time>
                  {unread > 0 ? (
                    <span className="chat__unread" aria-label={`${unread} unread`}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </span>
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
            <p>Raizing Global, a case room, or use Chat with embassy for another mission.</p>
          </div>
        ) : (
          <>
            <header className="chat__thread-head">
              <div>
                <h2>{activeRoom ? roomLabel(activeRoom, myEmbassyId) : 'Conversation'}</h2>
                <p>
                  {activeRoom?.type === 'inter_embassy' && activePeer
                    ? `Coordination with ${activePeer.name || activePeer.code || 'embassy'}`
                    : activeRoom
                      ? roomSubtitle(activeRoom, myEmbassyId)
                      : 'Loading…'}
                </p>
              </div>
              {caseAppId ? (
                <Link className="chat__case" to={`/applications/${caseAppId}`}>
                  Open case
                </Link>
              ) : null}
            </header>

            <div className="chat__messages" ref={messagesRef}>
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
                const fromOtherEmbassy =
                  msg.senderType === 'embassy_staff' && !mine && activeRoom?.type === 'inter_embassy';
                return (
                  <div
                    key={msg._id}
                    className={`chat__msg${mine ? ' is-mine' : ''}`}
                  >
                    <article
                      className={`chat__bubble${mine ? ' is-mine' : ''}${fromAdmin ? ' is-admin' : ''}${fromOtherEmbassy ? ' is-peer' : ''}`}
                    >
                      <header>
                        <strong>{mine ? 'You' : msg.senderName}</strong>
                        <span>
                          {msg.senderType === 'staff'
                            ? 'Raizing Global'
                            : fromOtherEmbassy
                              ? activePeer?.code || 'Embassy'
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
                    {mine ? (
                      <div
                        className={`chat__receipt${messageIsSeen(msg) ? ' is-seen' : ''}`}
                        aria-label={messageIsSeen(msg) ? 'Seen' : 'Sent'}
                      >
                        {messageIsSeen(msg) ? (
                          <>
                            <CheckCheck size={14} />
                            Seen
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            Sent
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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

      {pickerOpen ? (
        <div className="chat__picker" role="dialog" aria-modal="true" aria-label="Chat with embassy">
          <button
            type="button"
            className="chat__picker-backdrop"
            aria-label="Close"
            onClick={() => setPickerOpen(false)}
          />
          <div className="chat__picker-panel">
            <header>
              <div>
                <h2>Chat with embassy</h2>
                <p>Start or continue coordination with another mission</p>
              </div>
              <button type="button" aria-label="Close picker" onClick={() => setPickerOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <input
              type="search"
              placeholder="Search by name or code…"
              value={peerQuery}
              onChange={(e) => setPeerQuery(e.target.value)}
              autoFocus
            />
            <div className="chat__picker-list">
              {peersLoading ? <p className="chat__empty">Loading embassies…</p> : null}
              {!peersLoading && filteredPeers.length === 0 ? (
                <p className="chat__empty">No other active embassies found.</p>
              ) : null}
              {filteredPeers.map((peer) => (
                <button
                  key={peer._id}
                  type="button"
                  className="chat__picker-item"
                  disabled={openingPeer === peer._id}
                  onClick={() => void startChatWithPeer(peer)}
                >
                  <span className="chat__room-icon" aria-hidden>
                    <Building2 size={16} />
                  </span>
                  <span>
                    <strong>{peer.name}</strong>
                    <span>{peer.code}</span>
                  </span>
                  <em>{openingPeer === peer._id ? 'Opening…' : 'Open'}</em>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
