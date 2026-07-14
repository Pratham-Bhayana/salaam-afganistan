import { apiFetch } from './client';
import type { ApplicationStatus, ListMeta } from './applications';

export type EmbassyContact = {
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
};

export type EmbassyBranding = {
  primaryColor?: string;
  secondaryColor?: string;
};

export type Embassy = {
  _id: string;
  code: string;
  name: string;
  logoUrl?: string;
  branding?: EmbassyBranding;
  contact?: EmbassyContact;
  jurisdictionCountries?: string[];
  supportedVisaTypeCodes?: string[];
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmbassyStatusCount = {
  _id: string;
  count: number;
};

export type EmbassyDetailPayload = {
  embassy: Embassy;
  statusCounts: EmbassyStatusCount[];
};

export type EmbassyApplicationRow = {
  _id: string;
  referenceId: string;
  status: ApplicationStatus | string;
  visaTypeCode: string;
  personal?: {
    fullName?: string;
    nationality?: string;
  };
  sentToEmbassyAt?: string;
  decidedAt?: string;
};

export type CreateEmbassyInput = {
  code: string;
  name: string;
  logoUrl?: string;
  branding?: EmbassyBranding;
  contact?: EmbassyContact;
  jurisdictionCountries?: string[];
  supportedVisaTypeCodes?: string[];
  isActive?: boolean;
  notes?: string;
};

export type UpdateEmbassyInput = Omit<CreateEmbassyInput, 'code'>;

export type { ListMeta };

export async function listEmbassies(params: {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.q) qs.set('q', params.q);
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));

  return apiFetch<Embassy[]>(`/embassies?${qs.toString()}`);
}

export async function getEmbassy(id: string) {
  return apiFetch<EmbassyDetailPayload>(`/embassies/${id}`);
}

export async function createEmbassy(body: CreateEmbassyInput) {
  return apiFetch<Embassy>('/embassies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateEmbassy(id: string, body: UpdateEmbassyInput) {
  return apiFetch<Embassy>(`/embassies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteEmbassy(id: string) {
  return apiFetch<{ deleted: boolean; id: string }>(`/embassies/${id}`, {
    method: 'DELETE',
  });
}

export async function listEmbassyApplications(
  id: string,
  params: { page?: number; limit?: number; status?: string } = {}
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);

  return apiFetch<EmbassyApplicationRow[]>(`/embassies/${id}/applications?${qs.toString()}`);
}

export type VisaTypeOption = {
  _id: string;
  code: string;
  name: string;
  channel?: string;
  isActive?: boolean;
};

async function listVisaTypesPublic(channel?: 'evisa' | 'embassy') {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const qs = new URLSearchParams();
  if (channel) qs.set('channel', channel);
  const res = await fetch(`${API_BASE}/api/v1/visa-types?${qs.toString()}`);
  const json = (await res.json()) as {
    success: boolean;
    data?: VisaTypeOption[];
    message?: string;
  };
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to load visa types');
  }
  return { data: json.data || [] };
}

export async function listVisaTypesForPicker(channel?: 'evisa' | 'embassy') {
  const qs = new URLSearchParams();
  if (channel) qs.set('channel', channel);
  qs.set('isActive', 'true');
  try {
    return await apiFetch<VisaTypeOption[]>(`/visa-types?${qs.toString()}`);
  } catch {
    return listVisaTypesPublic(channel);
  }
}
