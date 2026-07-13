/**
 * PRD Section 10 — Admin RBAC permission matrix (API-enforced)
 */

const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  CASE_MANAGER: 'case_manager',
  FINANCE: 'finance',
  RECEPTIONIST: 'receptionist',
});

const PERMISSIONS = Object.freeze({
  APPLICATIONS_READ: 'applications:read',
  APPLICATIONS_WRITE: 'applications:write',
  APPLICATIONS_STATUS: 'applications:status',
  APPLICATIONS_INTAKE: 'applications:intake',
  FEES_CONTENT_MANAGE: 'fees_content:manage',
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  REPORTS_EXPORT: 'reports:export',
  STAFF_MANAGE: 'staff:manage',
  EMBASSY_SETUP: 'embassy:setup',
  CHAT_ACCESS: 'chat:access',
  SETTINGS_MANAGE: 'settings:manage',
  TEMPLATES_MANAGE: 'templates:manage',
  DOCUMENTS_DELIVER: 'documents:deliver',
  VISAS_ISSUED_MANAGE: 'visas_issued:manage',
  RECORDS_EXPORT: 'records:export',
  AUDIT_READ: 'audit:read',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: ['*'],
  [ROLES.CASE_MANAGER]: [
    PERMISSIONS.APPLICATIONS_READ,
    PERMISSIONS.APPLICATIONS_WRITE,
    PERMISSIONS.APPLICATIONS_STATUS,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.CHAT_ACCESS,
    PERMISSIONS.DOCUMENTS_DELIVER,
    PERMISSIONS.VISAS_ISSUED_MANAGE,
    PERMISSIONS.RECORDS_EXPORT,
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLES.FINANCE]: [
    PERMISSIONS.APPLICATIONS_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.RECORDS_EXPORT,
  ],
  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.APPLICATIONS_READ,
    PERMISSIONS.APPLICATIONS_INTAKE,
  ],
});

function roleHasPermission(role, permission) {
  const granted = ROLE_PERMISSIONS[role] || [];
  if (granted.includes('*')) return true;
  return granted.includes(permission);
}

function getPermissionsForRole(role) {
  if (role === ROLES.SUPER_ADMIN) return Object.values(PERMISSIONS);
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  getPermissionsForRole,
};
