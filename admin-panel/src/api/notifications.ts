import { apiFetch } from './client';

export type PanelNotification = {
  _id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  application?: string;
};

export function notificationMessage(n: PanelNotification) {
  return n.body || n.message || '';
}

export async function fetchNotifications(opts?: { unreadOnly?: boolean; limit?: number }) {
  const qs = new URLSearchParams();
  if (opts?.unreadOnly) qs.set('unreadOnly', 'true');
  if (opts?.limit) qs.set('limit', String(opts.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<PanelNotification[]>(`/notifications${suffix}`);
}

export async function markNotificationRead(id: string) {
  return apiFetch<PanelNotification>(`/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
