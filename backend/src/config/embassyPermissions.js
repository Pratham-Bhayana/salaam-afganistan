/**
 * PRD Section 9 / 10 — Embassy panel RBAC
 */

const EMBASSY_ROLES = Object.freeze({
  EMBASSY_ADMIN: 'embassy_admin',
  EMBASSY_STAFF: 'embassy_staff',
});

const EMBASSY_PERMISSIONS = Object.freeze({
  APPLICATIONS_READ: 'embassy.applications:read',
  APPLICATIONS_DECIDE: 'embassy.applications:decide',
  APPLICATIONS_ASSIGN: 'embassy.applications:assign',
  CHAT_ACCESS: 'embassy.chat:access',
  REPORTS_READ: 'embassy.reports:read',
  STAFF_MANAGE: 'embassy.staff:manage',
  ACTIVITY_READ: 'embassy.activity:read',
  DOCUMENTS_VIEW: 'embassy.documents:view',
});

const EMBASSY_ROLE_PERMISSIONS = Object.freeze({
  [EMBASSY_ROLES.EMBASSY_ADMIN]: ['*'],
  [EMBASSY_ROLES.EMBASSY_STAFF]: [
    EMBASSY_PERMISSIONS.APPLICATIONS_READ,
    EMBASSY_PERMISSIONS.APPLICATIONS_DECIDE,
    EMBASSY_PERMISSIONS.CHAT_ACCESS,
    EMBASSY_PERMISSIONS.DOCUMENTS_VIEW,
    EMBASSY_PERMISSIONS.ACTIVITY_READ,
  ],
});

function embassyRoleHasPermission(role, permission) {
  const granted = EMBASSY_ROLE_PERMISSIONS[role] || [];
  if (granted.includes('*')) return true;
  return granted.includes(permission);
}

function getEmbassyPermissionsForRole(role) {
  if (role === EMBASSY_ROLES.EMBASSY_ADMIN) return Object.values(EMBASSY_PERMISSIONS);
  return EMBASSY_ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  EMBASSY_ROLES,
  EMBASSY_PERMISSIONS,
  EMBASSY_ROLE_PERMISSIONS,
  embassyRoleHasPermission,
  getEmbassyPermissionsForRole,
};
