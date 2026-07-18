import { apiFetch, getAccessToken, ADMIN_PREFIX, ApiError } from './client';
import type { ApplicationDetail, ApplicationListItem, ApplicationStatus } from './applications';

export type LookupResult = {
  _id: string;
  referenceId: string;
  status: ApplicationStatus;
  visaTypeCode: string;
  source?: string;
  paymentStatus?: string;
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    nationality?: string;
  };
  passport?: {
    passportNumber?: string;
  };
  createdAt?: string;
};

export type IntakePersonal = {
  fullName: string;
  email: string;
  phone?: string;
  nationality: string;
  dateOfBirth?: string;
  sex?: string;
  countryOfResidence?: string;
};

export type IntakePassport = {
  passportNumber?: string;
  expiryDate?: string;
  issuingCountry?: string;
  nationality?: string;
};

export type IntakeTravel = {
  purpose?: string;
  intendedEntryDate?: string;
  intendedExitDate?: string;
  processingSpeed?: string;
  addressInAfghanistan?: string;
};

export type CreateIntakeInput = {
  visaTypeCode: string;
  source?: 'walk_in' | 'receptionist' | 'phone';
  submit?: boolean;
  personal: IntakePersonal;
  passport?: IntakePassport;
  travel?: IntakeTravel;
  note?: string;
};

export type UpdateIntakeInput = {
  personal?: Partial<IntakePersonal>;
  passport?: IntakePassport;
  travel?: IntakeTravel;
  note?: string;
};

export type RecordCounterPaymentInput = {
  applicationId: string;
  amount: number;
  currency?: string;
  notes?: string;
};

export async function lookupApplications(q: string) {
  const qs = new URLSearchParams({ q: q.trim() });
  return apiFetch<LookupResult[]>(`/receptionist/lookup?${qs.toString()}`);
}

export async function createWalkInApplication(body: CreateIntakeInput) {
  return apiFetch<ApplicationListItem>('/applications', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      source: body.source || 'walk_in',
    }),
  });
}

export async function updateWalkInApplication(id: string, body: UpdateIntakeInput) {
  return apiFetch<ApplicationDetail>(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function submitWalkInApplication(id: string, note?: string) {
  return apiFetch<{ application: ApplicationDetail }>(`/applications/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({
      toStatus: 'pending' as ApplicationStatus,
      note: note || 'Submitted at reception desk',
    }),
  });
}

export async function recordCounterPayment(body: RecordCounterPaymentInput) {
  return apiFetch<{ _id: string; referenceId?: string; amount?: number; status?: string }>(
    '/finance/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        applicationId: body.applicationId,
        amount: body.amount,
        currency: body.currency || 'USD',
        status: 'successful',
        provider: 'counter',
        notes: body.notes || 'Cash/card at reception counter',
      }),
    }
  );
}

export async function deliverWalkInDocument(
  applicationId: string,
  file: File,
  meta: { label?: string; key?: string; note?: string } = {}
) {
  const form = new FormData();
  form.append('file', file);
  if (meta.label) form.append('label', meta.label);
  if (meta.key) form.append('key', meta.key);
  if (meta.note) form.append('note', meta.note);

  const token = getAccessToken();
  const res = await fetch(`${ADMIN_PREFIX}/applications/${applicationId}/documents/deliver`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: unknown;
  } | null;

  if (!res.ok || !json?.success) {
    throw new ApiError(res.status, json?.message || 'Document upload failed');
  }

  return json.data;
}

export async function listTodayWalkIns() {
  const qs = new URLSearchParams({ page: '1', limit: '100' });
  const { data } = await apiFetch<ApplicationListItem[]>(`/applications?${qs.toString()}`);
  const today = new Date().toDateString();
  const filtered = (data || []).filter(
    (row) =>
      (row.source === 'walk_in' || row.source === 'receptionist') &&
      row.createdAt &&
      new Date(row.createdAt).toDateString() === today
  );
  return { data: filtered };
}

export function statusGuidance(status: ApplicationStatus | string): string {
  switch (status) {
    case 'draft':
      return 'Intake incomplete — finish details and submit to processing queue.';
    case 'pending':
      return 'Submitted — case manager will review. Applicant may be contacted for documents.';
    case 'documents_required':
      return 'Additional documents needed — applicant should upload or bring copies to the desk.';
    case 'sent_to_embassy':
    case 'under_embassy_review':
      return 'With embassy — decision pending. Share reference ID if applicant follows up.';
    case 'approved':
      return 'Approved — visa generation in progress or ready for collection per embassy process.';
    case 'visa_issued':
      return 'Visa issued — applicant can download from their profile or collect per office policy.';
    case 'rejected':
      return 'Application rejected — share reference ID; applicant may inquire about appeal/reapply rules.';
    default:
      return 'Check with case manager for next steps.';
  }
}

export function formatDateTime(value?: string | null) {
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
