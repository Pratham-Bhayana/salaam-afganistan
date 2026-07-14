import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Inbox,
  MessagesSquare,
  BarChart3,
  Users,
  ScrollText,
} from 'lucide-react';

export type EmbassyNavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: number;
};

/** PRD §9 — Dashboard + Applications + Chat live */
export const embassyNav: EmbassyNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, enabled: true },
  { id: 'applications', label: 'Applications', path: '/applications', icon: Inbox, enabled: true },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessagesSquare, enabled: true },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, enabled: false },
  { id: 'staff', label: 'Staff', path: '/staff', icon: Users, enabled: false },
  { id: 'activity', label: 'Activity Logs', path: '/activity', icon: ScrollText, enabled: false },
];