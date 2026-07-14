import { apiFetch } from './client';

export type AuditLog = {
  _id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actorType: 'staff' | 'applicant' | 'system' | 'embassy' | string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  ip?: string;
  userAgent?: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
  createdAt?: string;
};

export async function listAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.action) qs.set('action', params.action);
  if (params.resourceType) qs.set('resourceType', params.resourceType);
  if (params.resourceId) qs.set('resourceId', params.resourceId);
  if (params.actorId) qs.set('actorId', params.actorId);

  return apiFetch<AuditLog[]>(`/audit-logs?${qs.toString()}`);
}
