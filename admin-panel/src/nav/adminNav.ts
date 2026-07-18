import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  FolderSearch,
  Wallet,
  Building2,
  MessagesSquare,
  Tags,
  LayoutTemplate,
  UserRoundSearch,
  Users,
  Settings,
  ScrollText,
  Activity,
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
  { id: 'records', label: 'Records', path: '/records', icon: FolderSearch, enabled: true },
  { id: 'finance', label: 'Finance & Reports', path: '/finance', icon: Wallet, enabled: false },
  { id: 'embassies', label: 'Embassies', path: '/embassies', icon: Building2, enabled: true },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, enabled: true },
  { id: 'fees', label: 'Fees & Content', path: '/fees-content', icon: Tags, enabled: false },
  { id: 'templates', label: 'Visa Templates', path: '/visa-templates', icon: LayoutTemplate, enabled: true },
  { id: 'receptionist', label: 'Receptionist', path: '/receptionist', icon: UserRoundSearch, enabled: true },
  { id: 'staff', label: 'Staff', path: '/staff', icon: Users, enabled: true },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, enabled: true },
  { id: 'audit', label: 'Audit Logs', path: '/audit-logs', icon: ScrollText, enabled: true },
  {
    id: 'embassy-activity',
    label: 'Embassy Activity',
    path: '/embassy-activity',
    icon: Activity,
    enabled: true,
  },
];