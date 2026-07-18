import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Inbox,
  MessagesSquare,
  BarChart3,
  Users,
  ScrollText,
  FolderSearch,
} from 'lucide-react';

export type EmbassyNavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: number;
  /** Optional embassy permission required to see this item. */
  permission?: string;
};

/** PRD §9 — Dashboard + Applications + Chat live */
export const embassyNav: EmbassyNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, enabled: true },
  { id: 'applications', label: 'Applications', path: '/applications', icon: Inbox, enabled: true },
  { id: 'records', label: 'Records', path: '/records', icon: FolderSearch, enabled: true },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, enabled: true },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, enabled: false },
  {
    id: 'staff',
    label: 'Staff',
    path: '/staff',
    icon: Users,
    enabled: true,
    permission: 'embassy.staff:manage',
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    path: '/activity',
    icon: ScrollText,
    enabled: true,
    permission: 'embassy.activity:read',
  },
];