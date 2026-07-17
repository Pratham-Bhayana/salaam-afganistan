import { apiFetch, apiFetchBlob } from './client';

export type DecisionRecord = {
  _id: string;
  referenceId: string;
  status: string;
  decisionStatus: string;
  decidedAt?: string;
  decidedByType?: string;
  decidedByOrg?: string;
  decidedByName?: string | null;
  decidedByTitle: string;
  decisionNote?: string | null;
  visaTypeCode?: string;
  channel?: string;
  applicantName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  purpose?: string;
  intendedEntryDate?: string | null;
  intendedExitDate?: string | null;
  addressInAfghanistan?: string;
  paymentStatus?: string;
  rejectionReason?: string;
  embassy?: { _id?: string; name?: string; code?: string } | null;
  visaNumber?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  issuedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RecordsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  period?: 'all' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  from?: string;
  to?: string;
  decision?: 'approved' | 'rejected';
  status?: string;
};

export async function listDecisionRecords(params: RecordsQuery = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  if (params.period) qs.set('period', params.period);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.decision) qs.set('decision', params.decision);
  if (params.status) qs.set('status', params.status);
  return apiFetch<DecisionRecord[]>(`/records?${qs.toString()}`);
}

export async function exportDecisionRecords(params: RecordsQuery = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.period) qs.set('period', params.period);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.decision) qs.set('decision', params.decision);
  if (params.status) qs.set('status', params.status);
  const { blob } = await apiFetchBlob(`/records/export?${qs.toString()}`);
  return blob;
}

export function formatRecordDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function decisionLabel(status: string) {
  if (status === 'approved' || status === 'visa_issued') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return status.replaceAll('_', ' ');
}
