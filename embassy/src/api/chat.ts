import { apiFetch } from './client';

export type ChatRoomType = 'general' | 'application';

export type ChatRoom = {
  _id: string;
  title: string;
  type: ChatRoomType;
  isActive?: boolean;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type ChatMessage = {
  _id: string;
  room: string;
  body: string;
  senderType: 'staff' | 'embassy_staff' | 'system';
  senderId: string;
  senderName: string;
  senderRole?: string;
  attachments?: ChatAttachment[];
  createdAt: string;
};

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

export async function listChatMessages(roomId: string, params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ChatMessage[]>(`/chat/rooms/${roomId}/messages${suffix}`);
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

export function roomLabel(room: ChatRoom) {
  if (room.type === 'general') return room.title || 'General coordination';
  const app = typeof room.application === 'object' && room.application ? room.application : null;
  if (app?.referenceId) return app.referenceId;
  return room.title || 'Case chat';
}

export function roomSubtitle(room: ChatRoom) {
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
