import { apiFetch } from './client';

export type EmbassyRef = {
  _id: string;
  name?: string;
  code?: string;
};

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
  embassy?: EmbassyRef | string | null;
  embassyStaff?: EmbassyActivityStaff | string | null;
  application?: EmbassyActivityApplication | string | null;
  ip?: string;
  userAgent?: string;
  meta?: unknown;
  createdAt?: string;
};

export type EmbassyActivityQuery = {
  page?: number;
  limit?: number;
  embassy?: string;
  embassyStaff?: string;
  action?: string;
  resourceType?: string;
  application?: string;
  from?: string;
  to?: string;
};

export async function listEmbassyActivity(params: EmbassyActivityQuery = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.embassy) qs.set('embassy', params.embassy);
  if (params.embassyStaff) qs.set('embassyStaff', params.embassyStaff);
  if (params.action) qs.set('action', params.action);
  if (params.resourceType) qs.set('resourceType', params.resourceType);
  if (params.application) qs.set('application', params.application);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  return apiFetch<EmbassyActivityLog[]>(`/embassy-activity?${qs.toString()}`);
}

export async function listActivityEmbassies() {
  return apiFetch<EmbassyRef[]>('/embassy-activity/embassies');
}

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

export const EMBASSY_ACTIONS = Object.keys(ACTION_LABELS);

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replaceAll('.', ' ').replaceAll('_', ' ');
}

export function embassyName(embassy: EmbassyActivityLog['embassy']): string {
  if (!embassy || typeof embassy === 'string') return '—';
  if (embassy.name && embassy.code) return `${embassy.name} (${embassy.code})`;
  return embassy.name || embassy.code || '—';
}

export function activityStaffName(staff: EmbassyActivityLog['embassyStaff']): string {
  if (!staff || typeof staff === 'string') return '—';
  const name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
  return name || staff.email || '—';
}
