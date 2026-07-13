import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  FolderSearch,
  Wallet,
  Building2,
  MessagesSquare,
  Tags,
  Stamp,
  LayoutTemplate,
  UserRoundSearch,
  Users,
  Settings,
  ScrollText,
} from 'lucide-react';

export type AdminNavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: number;
};

export const adminNav: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, enabled: true },
  { id: 'applications', label: 'Applications', path: '/applications', icon: FileText, enabled: true },
  { id: 'records', label: 'Records', path: '/records', icon: FolderSearch, enabled: false },
  { id: 'finance', label: 'Finance & Reports', path: '/finance', icon: Wallet, enabled: false },
  { id: 'embassies', label: 'Embassies', path: '/embassies', icon: Building2, enabled: false },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, enabled: false, badge: 2 },
  { id: 'fees', label: 'Fees & Content', path: '/fees-content', icon: Tags, enabled: false },
  { id: 'issued', label: 'Issued Visas', path: '/issued-visas', icon: Stamp, enabled: false },
  { id: 'templates', label: 'Visa Templates', path: '/visa-templates', icon: LayoutTemplate, enabled: false },
  { id: 'receptionist', label: 'Receptionist', path: '/receptionist', icon: UserRoundSearch, enabled: false },
  { id: 'staff', label: 'Staff', path: '/staff', icon: Users, enabled: false },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, enabled: false },
  { id: 'audit', label: 'Audit Logs', path: '/audit-logs', icon: ScrollText, enabled: false },
];
