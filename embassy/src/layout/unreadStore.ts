import { useSyncExternalStore } from 'react';
import {
  applicationUnreadMap,
  fetchChatUnread,
  listChatRooms,
  type ChatRoom,
} from '../api/chat';
import { fetchNotifications } from '../api/notifications';

export type UnreadState = {
  chatUnread: number;
  notifUnread: number;
  applicationUnreadByAppId: Record<string, number>;
};

let state: UnreadState = {
  chatUnread: 0,
  notifUnread: 0,
  applicationUnreadByAppId: {},
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getUnreadState(): UnreadState {
  return state;
}

export function patchUnreadState(patch: Partial<UnreadState>) {
  state = { ...state, ...patch };
  emit();
}

export function resetUnreadState() {
  state = { chatUnread: 0, notifUnread: 0, applicationUnreadByAppId: {} };
  emit();
}

export function subscribeUnread(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadState(): UnreadState {
  return useSyncExternalStore(subscribeUnread, getUnreadState, getUnreadState);
}

function applicationIdFromRoom(room: ChatRoom) {
  if (room.type !== 'application') return '';
  const app = typeof room.application === 'object' && room.application ? room.application : null;
  return app?._id || (typeof room.application === 'string' ? room.application : '');
}

export function clearRoomUnread(room: Pick<ChatRoom, '_id' | 'unreadCount' | 'application' | 'type'>) {
  const count = room.unreadCount || 0;
  if (count <= 0) return;

  const appId = applicationIdFromRoom(room as ChatRoom);
  const nextAppMap = { ...state.applicationUnreadByAppId };

  if (appId) {
    const remaining = Math.max(0, (nextAppMap[appId] || 0) - count);
    if (remaining === 0) delete nextAppMap[appId];
    else nextAppMap[appId] = remaining;
  }

  patchUnreadState({
    chatUnread: Math.max(0, state.chatUnread - count),
    applicationUnreadByAppId: nextAppMap,
  });
}

export function decrementNotifUnread(by = 1) {
  patchUnreadState({ notifUnread: Math.max(0, state.notifUnread - by) });
}

export async function refreshUnreadCounts() {
  try {
    const [chatRes, notifRes, roomsRes] = await Promise.all([
      fetchChatUnread(),
      fetchNotifications({ unreadOnly: true, limit: 1 }),
      listChatRooms({ type: 'application' }),
    ]);

    const chatUnread =
      typeof chatRes.data?.totalUnread === 'number' ? chatRes.data.totalUnread : 0;
    const notifUnread =
      typeof notifRes.meta?.unreadCount === 'number' ? notifRes.meta.unreadCount : 0;
    const rooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];

    patchUnreadState({
      chatUnread,
      notifUnread,
      applicationUnreadByAppId: applicationUnreadMap(rooms),
    });
  } catch {
    /* best-effort */
  }
}
