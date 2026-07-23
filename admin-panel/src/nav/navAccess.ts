import { staffHasPermission, type StaffSession } from '../api/client';
import type { AdminNavItem } from './adminNav';

/**
 * Sidebar visibility from effective staff permissions (role + sectionOverrides).
 * Dashboard is always visible. Staff uses staff:manage (no section toggle).
 */
export function isNavItemVisible(
  staff: StaffSession | null | undefined,
  item: AdminNavItem,
  hasPermission: typeof staffHasPermission
): boolean {
  if (!item.enabled) return false;
  if (!staff) return false;
  if (staff.role === 'super_admin') return true;

  switch (item.id) {
    case 'dashboard':
      return true;
    case 'applications':
      return (
        hasPermission(staff, 'applications:read') ||
        hasPermission(staff, 'applications:intake')
      );
    case 'records':
      return hasPermission(staff, 'records:export');
    case 'finance':
      return hasPermission(staff, 'finance:read');
    case 'embassies':
      return hasPermission(staff, 'embassy:setup');
    case 'chat':
      return hasPermission(staff, 'chat:access');
    case 'fees':
    case 'templates':
      return hasPermission(staff, 'fees_content:manage');
    case 'receptionist':
      return hasPermission(staff, 'applications:intake');
    case 'staff':
      return hasPermission(staff, 'staff:manage');
    case 'settings':
      return hasPermission(staff, 'settings:manage');
    case 'audit':
    case 'embassy-activity':
      return hasPermission(staff, 'audit:read');
    default:
      return true;
  }
}

export function defaultHomePath(staff: StaffSession | null | undefined): string {
  if (staff?.role === 'receptionist') return '/receptionist';
  return '/applications';
}
