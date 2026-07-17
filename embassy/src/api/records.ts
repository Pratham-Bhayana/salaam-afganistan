import { apiFetch, getAccessToken, EMBASSY_PREFIX, ApiError } from './client';

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
  applicantName: string;
  email?: string;
  passportNumber?: string;
  nationality?: string;
  visaNumber?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  rejectionReason?: string;
};

export type RecordsQuery = {
  page?: number;
  limit?: number;
  q?: string;
  period?: 'all' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  from?: string;
  to?: string;
  decision?: 'approved' | 'rejected';
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
  return apiFetch<DecisionRecord[]>(`/records?${qs.toString()}`);
}

export async function exportDecisionRecords(params: RecordsQuery = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.period) qs.set('period', params.period);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.decision) qs.set('decision', params.decision);

  const token = getAccessToken();
  const res = await fetch(`${EMBASSY_PREFIX}/records/export?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'Export failed';
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.blob();
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
