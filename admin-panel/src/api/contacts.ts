import { apiFetch } from './client';

export type ContactStatus = 'new' | 'read' | 'archived';

export type ContactEnquiry = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listContacts(params: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);

  return apiFetch<ContactEnquiry[]>(`/contacts?${qs.toString()}`);
}

export async function getContact(id: string) {
  return apiFetch<ContactEnquiry>(`/contacts/${id}`);
}

export async function updateContactStatus(id: string, status: ContactStatus) {
  return apiFetch<ContactEnquiry>(`/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
