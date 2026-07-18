import { apiFetch, ApiError } from './client';
import {
  emptySections,
  type SectionKey,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from '../data/mockStaff';

/** Backend staff document shape from GET /api/v1/admin/staff */
export type BackendStaff = {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  designation?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  meta?: Record<string, string> | Map<string, string>;
  sectionOverrides?: Record<string, boolean> | Map<string, boolean>;
};

export type ListStaffParams = {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  isActive?: boolean;
};

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  designation?: string;
  isActive?: boolean;
};

export type UpdateStaffInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  designation?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
};

/**
 * UI label → backend role enum
 * Admin → super_admin
 * Coordinator → case_manager
 * Finance → finance
 * Receptionist → receptionist
 */
const UI_TO_BACKEND_ROLE: Record<StaffRole, string> = {
  Admin: 'super_admin',
  Coordinator: 'case_manager',
  Finance: 'finance',
  Receptionist: 'receptionist',
};

/**
 * Backend value → UI label
 * super_admin → Admin
 * case_manager → Coordinator
 * finance → Finance
 * receptionist → Receptionist
 */
const BACKEND_TO_UI_ROLE: Record<string, StaffRole> = {
  super_admin: 'Admin',
  case_manager: 'Coordinator',
  finance: 'Finance',
  receptionist: 'Receptionist',
};

/**
 * Maps backend RBAC permissions to Staff page section toggles.
 * Mirrors backend/src/config/permissions.js ROLE_PERMISSIONS (read-only reference).
 */
const ROLE_SECTION_DEFAULTS: Record<string, SectionKey[]> = {
  super_admin: [
    'dashboard',
    'applications',
    'records',
    'finance',
    'embassies',
    'chat',
    'fees',
    'templates',
    'receptionist',
    'settings',
    'audit',
    'embassy-activity',
  ],
  case_manager: [
    'dashboard',
    'applications',
    'records',
    'finance',
    'chat',
    'templates',
    'audit',
    'embassy-activity',
  ],
  finance: ['dashboard', 'applications', 'records', 'finance'],
  receptionist: ['dashboard', 'applications', 'receptionist'],
};

export function toBackendRole(role: StaffRole): string {
  return UI_TO_BACKEND_ROLE[role] ?? 'case_manager';
}

export function toUiRole(backendRole: string): StaffRole {
  return BACKEND_TO_UI_ROLE[backendRole] ?? 'Coordinator';
}

export function sectionsForBackendRole(backendRole: string): Record<SectionKey, boolean> {
  const keys = ROLE_SECTION_DEFAULTS[backendRole] || ROLE_SECTION_DEFAULTS.case_manager;
  const base = emptySections(false);
  for (const key of keys) base[key] = true;
  return base;
}

function toPlainOverrides(
  value: BackendStaff['sectionOverrides']
): Record<string, boolean> {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return { ...value };
}

/** Role defaults merged with persisted sectionOverrides from the API. */
export function mergeSectionAccess(
  backendRole: string,
  sectionOverrides?: BackendStaff['sectionOverrides']
): Record<SectionKey, boolean> {
  const base = sectionsForBackendRole(backendRole);
  const overrides = toPlainOverrides(sectionOverrides);
  const keys = Object.keys(overrides);
  if (keys.length === 0) return base;

  const merged = { ...base };
  for (const [key, enabled] of Object.entries(overrides)) {
    if (key in merged) merged[key as SectionKey] = Boolean(enabled);
  }
  return merged;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function isoDate(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

/** Transform backend staff → frontend StaffMember (field mapping lives here only). */
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

export async function getStaffByIdAPI(id: string) {
  const { data } = await apiFetch<BackendStaff>(`/staff/${id}`);
  return { data: transformStaff(data), raw: data };
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

  const body: CreateStaffInput = {
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
  const body: UpdateStaffInput = {};

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

/** Soft-deactivates staff (DELETE /api/v1/admin/staff/:id). */
export async function deleteStaffAPI(id: string) {
  const { data } = await apiFetch<BackendStaff>(`/staff/${id}`, {
    method: 'DELETE',
  });

  return { data: transformStaff(data), raw: data };
}

/** Update staff permissions — PATCH /api/v1/admin/staff/:id/permissions */
export async function updateStaffPermissionsAPI(
  id: string,
  sectionOverrides: Record<string, boolean>
) {
  return apiFetch<BackendStaff>(`/staff/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ sectionOverrides }),
  });
}

export { ApiError };
