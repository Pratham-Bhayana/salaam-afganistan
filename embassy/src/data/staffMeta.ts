export type StaffRole = 'Embassy Admin' | 'Embassy Staff';
export type StaffStatus = 'Active' | 'Inactive';

export type SectionKey =
  | 'dashboard'
  | 'applications'
  | 'records'
  | 'chat'
  | 'reports'
  | 'staff'
  | 'activity';

export type StaffSection = {
  key: SectionKey;
  label: string;
};

export type StaffMember = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  role: StaffRole;
  status: StaffStatus;
  joinedAt: string;
  lastActiveAt: string;
  sections: Record<SectionKey, boolean>;
};

/** Access Management tabs — same names/order as the embassy sidebar. */
export const STAFF_SECTIONS: StaffSection[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'applications', label: 'Applications' },
  { key: 'records', label: 'Records' },
  { key: 'chat', label: 'Chat' },
  { key: 'reports', label: 'Reports' },
  { key: 'staff', label: 'Staff' },
  { key: 'activity', label: 'Activity Logs' },
];

export const STAFF_ROLES: StaffRole[] = ['Embassy Admin', 'Embassy Staff'];

/** UI role label ↔ backend enum */
export const UI_TO_BACKEND_ROLE: Record<StaffRole, string> = {
  'Embassy Admin': 'embassy_admin',
  'Embassy Staff': 'embassy_staff',
};

const BACKEND_TO_UI_ROLE: Record<string, StaffRole> = {
  embassy_admin: 'Embassy Admin',
  embassy_staff: 'Embassy Staff',
};

export function toBackendRole(role: StaffRole): string {
  return UI_TO_BACKEND_ROLE[role] ?? 'embassy_staff';
}

export function toUiRole(backendRole: string): StaffRole {
  return BACKEND_TO_UI_ROLE[backendRole] ?? 'Embassy Staff';
}

/** Mirrors backend embassyPermissions role → visible sections. */
const ROLE_SECTION_DEFAULTS: Record<string, SectionKey[]> = {
  embassy_admin: ['dashboard', 'applications', 'records', 'chat', 'reports', 'staff', 'activity'],
  embassy_staff: ['dashboard', 'applications', 'records', 'chat', 'activity'],
};

export function emptySections(enabled = false): Record<SectionKey, boolean> {
  return STAFF_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = enabled;
      return acc;
    },
    {} as Record<SectionKey, boolean>
  );
}

export function sectionsForBackendRole(backendRole: string): Record<SectionKey, boolean> {
  const keys = ROLE_SECTION_DEFAULTS[backendRole] || ROLE_SECTION_DEFAULTS.embassy_staff;
  const base = emptySections(false);
  for (const key of keys) base[key] = true;
  return base;
}

function toPlainOverrides(
  value?: Record<string, boolean> | Map<string, boolean> | null
): Record<string, boolean> {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return { ...value };
}

/** Role defaults merged with persisted sectionOverrides from the API. */
export function mergeSectionAccess(
  backendRole: string,
  sectionOverrides?: Record<string, boolean> | Map<string, boolean> | null
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

export function sectionAccessCount(sections: Record<SectionKey, boolean>) {
  return STAFF_SECTIONS.filter((s) => sections[s.key]).length;
}

export function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Safe CSS class suffix for a role pill. */
export function roleCssModifier(role: StaffRole) {
  return role === 'Embassy Admin' ? 'admin' : 'staff';
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
