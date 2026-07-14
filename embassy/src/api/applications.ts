import { apiFetch, getAccessToken, EMBASSY_PREFIX } from './client';

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

export type DecideStatus =
  | 'under_embassy_review'
  | 'approved'
  | 'rejected'
  | 'documents_required';

export type EmbassyStaffRef = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
} | null;

export type ApplicationDocument = {
  _id: string;
  key: string;
  label: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
};

export type ApplicationListItem = {
  _id: string;
  referenceId: string;
  visaTypeCode: string;
  channel?: string;
  status: ApplicationStatus;
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    sex?: string;
    nationality?: string;
    countryOfResidence?: string;
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
    citiesToVisit?: string;
  };
  paymentStatus?: string;
  submittedAt?: string;
  sentToEmbassyAt?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedEmbassyStaff?: EmbassyStaffRef;
  documentRequestNote?: string;
  rejectionReason?: string;
};

export type ApplicationDetail = ApplicationListItem & {
  documents?: ApplicationDocument[];
  requestedDocuments?: Array<{
    _id?: string;
    name: string;
    key: string;
    status: 'pending' | 'uploaded' | 'cancelled';
    note?: string;
    requestedAt?: string;
  }>;
  allowedNextStatuses?: ApplicationStatus[];
  issuedVisa?: {
    visaNumber?: string;
    referenceId?: string;
    issuedAt?: string;
  } | null;
  activity?: Array<{
    action: string;
    note?: string;
    fromStatus?: string;
    toStatus?: string;
    at?: string;
    actorName?: string;
    actorType?: string;
  }>;
  applicant?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
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
  inbox?: 'active';
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.inbox) qs.set('inbox', params.inbox);

  return apiFetch<ApplicationListItem[]>(`/applications?${qs.toString()}`);
}

export async function getApplication(id: string) {
  return apiFetch<ApplicationDetail>(`/applications/${id}`);
}

export async function decideApplication(
  id: string,
  body: { toStatus: DecideStatus; note?: string; meta?: Record<string, unknown> }
) {
  return apiFetch<{ application: ApplicationDetail; issuedVisa?: unknown }>(
    `/applications/${id}/decide`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export async function addApplicationNote(id: string, note: string) {
  return apiFetch<ApplicationDetail>(`/applications/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function openApplicationDocument(applicationId: string, documentId: string) {
  const token = getAccessToken();
  const res = await fetch(
    `${EMBASSY_PREFIX}/applications/${applicationId}/documents/${documentId}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!res.ok) {
    throw new Error('Failed to open document');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

export function statusLabel(status: ApplicationStatus | string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function staffLabel(staff?: EmbassyStaffRef) {
  if (!staff) return 'Unassigned';
  const name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
  return name || staff.email || 'Unassigned';
}
