import { apiFetch } from './client';

export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'documents_required'
  | 'sent_to_embassy'
  | 'under_embassy_review'
  | 'approved'
  | 'rejected'
  | 'visa_issued'
  | 'closed'
  | 'archived';

export type RequestedDocument = {
  _id?: string;
  name: string;
  key: string;
  status: 'pending' | 'uploaded' | 'cancelled';
  note?: string;
  requestedAt?: string;
  fulfilledAt?: string;
};

export type ApplicationDocument = {
  _id: string;
  key: string;
  label: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
  deliveredAt?: string;
};

export type ApplicationListItem = {
  _id: string;
  referenceId: string;
  visaTypeCode: string;
  status: ApplicationStatus;
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    sex?: string;
    nationality?: string;
  };
  passport?: {
    passportNumber?: string;
    issuingCountry?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  travel?: {
    purpose?: string;
    intendedEntryDate?: string;
    intendedExitDate?: string;
    addressInAfghanistan?: string;
  };
  embassy?: { _id: string; name?: string; code?: string } | string | null;
  paymentStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  assignedCaseManager?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

export type ApplicationDetail = ApplicationListItem & {
  documents?: ApplicationDocument[];
  requestedDocuments?: RequestedDocument[];
  documentRequestNote?: string;
  rejectionReason?: string;
  allowedNextStatuses?: ApplicationStatus[];
  issuedVisa?: {
    _id: string;
    visaNumber?: string;
    validFrom?: string;
    validUntil?: string;
    issuedAt?: string;
    storagePath?: string;
  } | null;
  activity?: Array<{
    action: string;
    note?: string;
    fromStatus?: string;
    toStatus?: string;
    at?: string;
    actorName?: string;
  }>;
  payments?: Array<{ _id: string; amount?: number; currency?: string; status?: string }>;
};

export type ListMeta = {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
};

export async function listApplications(params: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);

  return apiFetch<ApplicationListItem[]>(`/applications?${qs.toString()}`);
}

export async function getApplication(id: string) {
  return apiFetch<ApplicationDetail>(`/applications/${id}`);
}

export async function changeApplicationStatus(
  id: string,
  body: {
    toStatus: ApplicationStatus;
    note?: string;
    embassy?: string;
    meta?: unknown;
    autoIssueVisa?: boolean;
    sendEmail?: boolean;
  }
) {
  return apiFetch<{ application: ApplicationDetail; issuedVisa?: unknown }>(
    `/applications/${id}/status`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export async function requestDocuments(
  id: string,
  body: { documentName?: string; documentNames?: string[]; note?: string }
) {
  return apiFetch<ApplicationDetail>(`/applications/${id}/documents/request`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function embassyLabel(embassy: ApplicationListItem['embassy']) {
  if (!embassy) return '—';
  if (typeof embassy === 'string') return embassy;
  if (embassy.code && embassy.name) return `${embassy.name} (${embassy.code})`;
  return embassy.name || embassy.code || '—';
}

export function statusLabel(status: ApplicationStatus) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
