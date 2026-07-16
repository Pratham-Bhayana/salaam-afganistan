export type StaffRole = 'Admin' | 'Coordinator' | 'Finance' | 'Receptionist';
export type StaffStatus = 'Active' | 'Inactive';

export type SectionKey =
  | 'dashboard'
  | 'applications'
  | 'records'
  | 'finance'
  | 'embassies'
  | 'chat'
  | 'fees'
  | 'templates'
  | 'receptionist'
  | 'settings'
  | 'audit';

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

/** Access Management tabs — same names/order as Admin Panel sidebar (SS3). */
export const STAFF_SECTIONS: StaffSection[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'applications', label: 'Applications' },
  { key: 'records', label: 'Records' },
  { key: 'finance', label: 'Finance & Reports' },
  { key: 'embassies', label: 'Embassies' },
  { key: 'chat', label: 'Chat' },
  { key: 'fees', label: 'Fees & Content' },
  { key: 'templates', label: 'Visa Templates' },
  { key: 'receptionist', label: 'Receptionist' },
  { key: 'settings', label: 'Settings' },
  { key: 'audit', label: 'Audit Logs' },
];

export const STAFF_ROLES: StaffRole[] = ['Admin', 'Coordinator', 'Finance', 'Receptionist'];

export function emptySections(enabled = false): Record<SectionKey, boolean> {
  return STAFF_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = enabled;
      return acc;
    },
    {} as Record<SectionKey, boolean>
  );
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

export function roleCssModifier(role: StaffRole) {
  return role.toLowerCase();
}
