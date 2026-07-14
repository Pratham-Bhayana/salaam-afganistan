export type StaffRole = 'Admin' | 'Coordinator';
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
  destination: string;
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

export const STAFF_ROLES: StaffRole[] = ['Admin', 'Coordinator'];

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

export const mockStaff: StaffMember[] = [
  {
    _id: '1',
    fullName: 'Pratham Bhayana',
    email: 'pratham1@email.com',
    phone: '+91 98765 43210',
    destination: 'UAE',
    role: 'Admin',
    status: 'Active',
    joinedAt: '2026-03-01',
    lastActiveAt: '2026-07-10',
    sections: { ...emptySections(false), dashboard: true },
  },
  {
    _id: '2',
    fullName: 'Reetu Sharma',
    email: 'reetu@email.com',
    phone: '+91 98111 22334',
    destination: 'UK',
    role: 'Coordinator',
    status: 'Active',
    joinedAt: '2026-04-12',
    lastActiveAt: '2026-07-09',
    sections: emptySections(true),
  },
  {
    _id: '3',
    fullName: 'Aisha Patel',
    email: 'aisha@email.com',
    phone: '+91 99000 11223',
    destination: 'Singapore',
    role: 'Coordinator',
    status: 'Active',
    joinedAt: '2026-02-18',
    lastActiveAt: '2026-07-08',
    sections: {
      ...emptySections(false),
      dashboard: true,
      applications: true,
      records: true,
      finance: true,
      embassies: true,
      chat: true,
      fees: true,
    },
  },
  {
    _id: '4',
    fullName: 'Omar Hassan',
    email: 'omar@email.com',
    phone: '+971 50 123 4567',
    destination: 'UAE',
    role: 'Coordinator',
    status: 'Active',
    joinedAt: '2026-05-03',
    lastActiveAt: '2026-07-07',
    sections: emptySections(true),
  },
];
