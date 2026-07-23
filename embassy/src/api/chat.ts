import { apiFetch } from './client';

export type ChatRoomType = 'general' | 'application' | 'inter_embassy';

export type EmbassyRef = {
  _id: string;
  name?: string;
  code?: string;
};

export type ChatRoom = {
  _id: string;
  title: string;
  type: ChatRoomType;
  isActive?: boolean;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
  embassy?: EmbassyRef | string | null;
  peerEmbassy?: EmbassyRef | string | null;
  application?:
    | {
        _id: string;
        referenceId?: string;
        status?: string;
      }
    | string
    | null;
};

export type ChatAttachment = {
  originalName?: string;
  mimeType?: string;
  storagePath?: string;
  size?: number;
};

export type ChatReadReceipt = {
  readerType?: string;
  readerId?: string;
  readAt?: string;
};

export type ChatMessage = {
  _id: string;
  room: string;
  body: string;
  senderType: 'staff' | 'embassy_staff' | 'system';
  senderId: string;
  senderName: string;
  senderRole?: string;
  attachments?: ChatAttachment[];
  readBy?: ChatReadReceipt[];
  createdAt: string;
};

export type PeerEmbassy = {
  _id: string;
  name: string;
  code: string;
};

function asEmbassyRef(value: ChatRoom['embassy'] | ChatRoom['peerEmbassy']): EmbassyRef | null {
  if (!value || typeof value !== 'object') return null;
  return value;
}

function refId(value: ChatRoom['embassy'] | ChatRoom['peerEmbassy'] | string | null | undefined) {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || '');
  return String(value);
}

/** The other embassy in an inter_embassy room relative to the logged-in mission. */
export function peerForRoom(room: ChatRoom, myEmbassyId?: string | null) {
  if (room.type !== 'inter_embassy') return null;
  const mine = myEmbassyId ? String(myEmbassyId) : '';
  const a = asEmbassyRef(room.embassy);
  const b = asEmbassyRef(room.peerEmbassy);
  if (!mine) return b || a;
  if (a && String(a._id) === mine) return b;
  if (b && String(b._id) === mine) return a;
  return b || a;
}

export async function listPeerEmbassies() {
  return apiFetch<PeerEmbassy[]>('/chat/peer-embassies');
}

export async function fetchChatUnread() {
  return apiFetch<{ totalUnread: number }>('/chat/unread');
}

export function applicationUnreadMap(rooms: ChatRoom[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const room of rooms) {
    if (room.type !== 'application') continue;
    const count = room.unreadCount || 0;
    if (count <= 0) continue;
    const app = typeof room.application === 'object' && room.application ? room.application : null;
    const appId = app?._id || (typeof room.application === 'string' ? room.application : '');
    if (!appId) continue;
    map[appId] = (map[appId] || 0) + count;
  }
  return map;
}

export async function listChatRooms(params?: { type?: ChatRoomType; application?: string }) {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.application) qs.set('application', params.application);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ChatRoom[]>(`/chat/rooms${suffix}`);
}

export async function ensureApplicationRoom(applicationId: string, title?: string) {
  return apiFetch<ChatRoom>('/chat/rooms/application', {
    method: 'POST',
    body: JSON.stringify({ applicationId, title }),
  });
}

export async function ensureInterEmbassyRoom(peerEmbassyId: string, title?: string) {
  return apiFetch<ChatRoom>('/chat/rooms/inter-embassy', {
    method: 'POST',
    body: JSON.stringify({ peerEmbassyId, title }),
  });
}

export async function listChatMessages(
  roomId: string,
  params?: { page?: number; limit?: number; markRead?: boolean }
) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.markRead === false) qs.set('markRead', 'false');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ChatMessage[]>(`/chat/rooms/${roomId}/messages${suffix}`);
}

export async function markChatRoomRead(roomId: string) {
  return apiFetch<{ roomId: string; modifiedCount: number }>(`/chat/rooms/${roomId}/read`, {
    method: 'POST',
  });
}

export async function sendChatMessage(roomId: string, body: string, files?: File[]) {
  const form = new FormData();
  form.append('body', body);
  if (files?.length) {
    for (const file of files) form.append('attachments', file);
  }
  return apiFetch<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: form,
  });
}

export function messageIsSeen(message: ChatMessage) {
  const sender = String(message.senderId || '');
  const readers = message.readBy || [];
  return readers.some((r) => r.readerId && String(r.readerId) !== sender);
}

export function roomLabel(room: ChatRoom, myEmbassyId?: string | null) {
  if (room.type === 'inter_embassy') {
    const peer = peerForRoom(room, myEmbassyId);
    if (peer?.name && peer?.code) return `${peer.name} (${peer.code})`;
    if (peer?.name) return peer.name;
    if (peer?.code) return peer.code;
    return room.title || 'Embassy coordination';
  }
  if (room.type === 'general') return room.title || 'General coordination';
  const app = typeof room.application === 'object' && room.application ? room.application : null;
  if (app?.referenceId) return app.referenceId;
  return room.title || 'Case chat';
}

export function roomSubtitle(room: ChatRoom, myEmbassyId?: string | null) {
  if (room.type === 'inter_embassy') {
    const peer = peerForRoom(room, myEmbassyId);
    const code = peer?.code ? ` · ${peer.code}` : '';
    return `Mission coordination${code}`;
  }
  if (room.type === 'general') return 'Raizing Global · Mission channel';
  const app = typeof room.application === 'object' && room.application ? room.application : null;
  if (app?.status) return `Case · ${app.status.replaceAll('_', ' ')}`;
  return 'Case coordination';
}

export function formatChatTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export { refId };
