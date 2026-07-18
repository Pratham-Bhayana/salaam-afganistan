import { apiFetch } from './client';

export type EmbassyActivityStaff = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

export type EmbassyActivityApplication = {
  _id: string;
  referenceId?: string;
  status?: string;
};

export type EmbassyActivityLog = {
  _id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  embassyStaff?: EmbassyActivityStaff | string | null;
  application?: EmbassyActivityApplication | string | null;
  ip?: string;
  userAgent?: string;
  meta?: unknown;
  createdAt?: string;
};

export type ActivityQuery = {
  page?: number;
  limit?: number;
  action?: string;
  embassyStaff?: string;
  application?: string;
};

export async function listEmbassyActivity(params: ActivityQuery = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.action) qs.set('action', params.action);
  if (params.embassyStaff) qs.set('embassyStaff', params.embassyStaff);
  if (params.application) qs.set('application', params.application);
  return apiFetch<EmbassyActivityLog[]>(`/activity-logs?${qs.toString()}`);
}

/** Human-friendly labels for known action codes. */
const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in',
  'application.view': 'Viewed application',
  'application.decide': 'Decided application',
  'application.assign': 'Assigned application',
  'application.delete': 'Deleted application',
  'application.note': 'Added note',
  'visa.issue': 'Issued visa',
  'document.view': 'Viewed document',
  'chat.message': 'Sent chat message',
  'staff.create': 'Created staff',
  'staff.update': 'Updated staff',
  'staff.deactivate': 'Deactivated staff',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replaceAll('.', ' ').replaceAll('_', ' ');
}

export function formatActivityDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function staffName(staff: EmbassyActivityLog['embassyStaff']): string {
  if (!staff || typeof staff === 'string') return '—';
  const name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
  return name || staff.email || '—';
}
