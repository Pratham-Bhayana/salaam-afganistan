import { apiFetch, ApiError } from './client';
import {
  emptySections,
  mergeSectionAccess,
  splitFullName,
  toBackendRole,
  toUiRole,
  type SectionKey,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from '../data/staffMeta';

/** Backend embassy staff document from GET /api/v1/embassy/staff */
export type BackendStaff = {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  designation?: string;
  role: string;
  accessMode?: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sectionOverrides?: Record<string, boolean> | Map<string, boolean>;
};

export type ListStaffParams = {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  isActive?: boolean;
};

type CreateStaffBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  designation?: string;
  isActive?: boolean;
};

type UpdateStaffBody = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  designation?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
};

function isoDate(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function transformStaff(raw: BackendStaff): StaffMember {
  return {
    _id: raw._id,
    fullName: (raw.fullName || `${raw.firstName} ${raw.lastName}`).trim(),
    email: raw.email,
    phone: raw.phone?.trim() || '—',
    designation: raw.designation?.trim() || '—',
    role: toUiRole(raw.role),
    status: (raw.isActive ? 'Active' : 'Inactive') as StaffStatus,
    joinedAt: isoDate(raw.createdAt),
    lastActiveAt: isoDate(raw.lastLoginAt || raw.updatedAt || raw.createdAt),
    sections: mergeSectionAccess(raw.role, raw.sectionOverrides),
  };
}

export async function getAllStaffAPI(params: ListStaffParams = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 100));
  if (params.q) qs.set('q', params.q);
  if (params.role) qs.set('role', params.role);
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));

  const { data, meta } = await apiFetch<BackendStaff[]>(`/staff?${qs.toString()}`);
  return {
    data: (data || []).map(transformStaff),
    meta,
    raw: data || [],
  };
}

export async function createStaffAPI(input: {
  fullName: string;
  email: string;
  password: string;
  role: StaffRole;
  phone?: string;
  designation?: string;
  status?: StaffStatus;
  sections?: Record<SectionKey, boolean>;
}) {
  const { firstName, lastName } = splitFullName(input.fullName);
  if (!firstName || !lastName) {
    throw new ApiError(400, 'Full name is required.');
  }

  const body: CreateStaffBody = {
    firstName,
    lastName,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: toBackendRole(input.role),
    phone: input.phone?.trim() || undefined,
    designation: input.designation?.trim() || undefined,
    isActive: input.status !== 'Inactive',
  };

  const { data } = await apiFetch<BackendStaff>('/staff', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (input.sections) {
    const updated = await updateStaffPermissionsAPI(data._id, input.sections);
    return { data: transformStaff(updated.data), raw: updated.data };
  }

  return { data: transformStaff(data), raw: data };
}

export async function updateStaffAPI(
  id: string,
  input: {
    fullName?: string;
    phone?: string;
    designation?: string;
    role?: StaffRole;
    status?: StaffStatus;
    password?: string;
  }
) {
  const body: UpdateStaffBody = {};

  if (input.fullName != null) {
    const { firstName, lastName } = splitFullName(input.fullName);
    body.firstName = firstName;
    body.lastName = lastName;
  }
  if (input.phone != null) body.phone = input.phone.trim();
  if (input.designation != null) body.designation = input.designation.trim();
  if (input.role != null) body.role = toBackendRole(input.role);
  if (input.status != null) body.isActive = input.status === 'Active';
  if (input.password?.trim()) body.password = input.password.trim();

  const { data } = await apiFetch<BackendStaff>(`/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  return { data: transformStaff(data), raw: data };
}

/** Soft-deactivates embassy staff (DELETE /api/v1/embassy/staff/:id). */
export async function deleteStaffAPI(id: string) {
  const { data } = await apiFetch<BackendStaff>(`/staff/${id}`, { method: 'DELETE' });
  return { data: transformStaff(data), raw: data };
}

/** PATCH /api/v1/embassy/staff/:id/permissions */
export async function updateStaffPermissionsAPI(
  id: string,
  sectionOverrides: Record<string, boolean>
) {
  return apiFetch<BackendStaff>(`/staff/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ sectionOverrides }),
  });
}

export { ApiError, emptySections };
