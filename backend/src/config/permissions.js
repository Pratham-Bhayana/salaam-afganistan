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
  DASHBOARD_READ: 'dashboard:read',
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

/**
 * Staff management Section Access toggles → permission strings.
 * Mirrors admin-panel SectionKey labels.
 */
const SECTION_PERMISSIONS = Object.freeze({
  dashboard: [PERMISSIONS.DASHBOARD_READ],
  applications: [PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.APPLICATIONS_WRITE],
  records: [PERMISSIONS.RECORDS_EXPORT],
  finance: [PERMISSIONS.FINANCE_READ],
  embassies: [PERMISSIONS.EMBASSY_SETUP],
  chat: [PERMISSIONS.CHAT_ACCESS],
  fees: [PERMISSIONS.FEES_CONTENT_MANAGE],
  // templates UI checks fees_content:manage; API routes require templates:manage
  templates: [PERMISSIONS.FEES_CONTENT_MANAGE, PERMISSIONS.TEMPLATES_MANAGE],
  receptionist: [PERMISSIONS.APPLICATIONS_INTAKE],
  settings: [PERMISSIONS.SETTINGS_MANAGE],
  audit: [PERMISSIONS.AUDIT_READ],
  'embassy-activity': [PERMISSIONS.AUDIT_READ],
});

/** Default enabled sections per role (before sectionOverrides). */
const ROLE_SECTION_DEFAULTS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.keys(SECTION_PERMISSIONS),
  [ROLES.CASE_MANAGER]: [
    'dashboard',
    'applications',
    'records',
    'finance',
    'chat',
    'templates',
    'audit',
    'embassy-activity',
  ],
  [ROLES.FINANCE]: ['dashboard', 'applications', 'records', 'finance'],
  [ROLES.RECEPTIONIST]: ['dashboard', 'applications', 'receptionist'],
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
    PERMISSIONS.FEES_CONTENT_MANAGE,
    PERMISSIONS.TEMPLATES_MANAGE,
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

const SECTION_CONTROLLED_PERMISSIONS = new Set(
  Object.values(SECTION_PERMISSIONS).flat()
);

function roleHasPermission(role, permission) {
  const granted = ROLE_PERMISSIONS[role] || [];
  if (granted.includes('*')) return true;
  return granted.includes(permission);
}

function getPermissionsForRole(role) {
  if (role === ROLES.SUPER_ADMIN) return Object.values(PERMISSIONS);
  return ROLE_PERMISSIONS[role] || [];
}

function toPlainOverrides(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value.toObject === 'function') return value.toObject();
  return { ...value };
}

function sectionsForRole(role) {
  const keys = ROLE_SECTION_DEFAULTS[role] || ROLE_SECTION_DEFAULTS[ROLES.CASE_MANAGER];
  const base = {};
  for (const key of Object.keys(SECTION_PERMISSIONS)) base[key] = false;
  for (const key of keys) base[key] = true;
  return base;
}

/** Role section defaults merged with persisted sectionOverrides. */
function mergeSectionAccess(role, sectionOverrides) {
  const merged = sectionsForRole(role);
  const overrides = toPlainOverrides(sectionOverrides);
  for (const [key, enabled] of Object.entries(overrides)) {
    if (key in SECTION_PERMISSIONS) merged[key] = Boolean(enabled);
  }
  return merged;
}

/**
 * Effective permissions for a staff member:
 * section toggles control SECTION_PERMISSIONS; other role perms are preserved.
 */
function getEffectivePermissions(role, sectionOverrides) {
  if (role === ROLES.SUPER_ADMIN) return ['*'];

  const sections = mergeSectionAccess(role, sectionOverrides);
  const perms = new Set();

  for (const [section, enabled] of Object.entries(sections)) {
    if (!enabled) continue;
    for (const p of SECTION_PERMISSIONS[section] || []) perms.add(p);
  }

  for (const p of getPermissionsForRole(role)) {
    if (!SECTION_CONTROLLED_PERMISSIONS.has(p)) perms.add(p);
  }

  return [...perms];
}

function hasEffectivePermission(role, permission, sectionOverrides) {
  const granted = getEffectivePermissions(role, sectionOverrides);
  return granted.includes('*') || granted.includes(permission);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  SECTION_PERMISSIONS,
  ROLE_SECTION_DEFAULTS,
  roleHasPermission,
  getPermissionsForRole,
  getEffectivePermissions,
  hasEffectivePermission,
  mergeSectionAccess,
};
