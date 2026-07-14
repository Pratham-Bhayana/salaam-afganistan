const { ROLES } = require('../../src/config/permissions');

const defaultSuperAdmin = {
  firstName: 'Super',
  lastName: 'Admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@salaam.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMeNow!123',
  role: ROLES.SUPER_ADMIN,
};

const defaultEmailTemplates = [
  {
    code: 'application_status_change',
    name: 'Application Status Change',
    subject: 'Application {{referenceId}} update: {{status}}',
    htmlBody:
      '<p>Dear {{fullName}},</p><p>Your application <strong>{{referenceId}}</strong> status is now <strong>{{status}}</strong>.</p><p>{{note}}</p>',
    textBody: 'Dear {{fullName}}, application {{referenceId}} is now {{status}}. {{note}}',
    placeholders: ['fullName', 'referenceId', 'status', 'note'],
    isActive: true,
  },
  {
    code: 'document_delivery',
    name: 'Document Delivered',
    subject: 'New document for application {{referenceId}}',
    htmlBody:
      '<p>Dear {{fullName}},</p><p>A document ({{documentLabel}}) was added to application {{referenceId}}.</p><p>{{note}}</p>',
    textBody: 'Document {{documentLabel}} added to {{referenceId}}. {{note}}',
    placeholders: ['fullName', 'referenceId', 'documentLabel', 'note'],
    isActive: true,
  },
  {
    code: 'visa_issued',
    name: 'Visa Issued',
    subject: 'Visa issued for {{referenceId}}',
    htmlBody:
      '<p>Dear {{fullName}},</p><p>Your visa <strong>{{visaNumber}}</strong> for application {{referenceId}} has been issued.</p>',
    textBody: 'Visa {{visaNumber}} issued for {{referenceId}}.',
    placeholders: ['fullName', 'referenceId', 'visaNumber'],
    isActive: true,
  },
];

const {
  defaultEvisaTemplateSeed,
} = require('../../src/services/evisaTemplateConfig');

const defaultVisaTemplate = defaultEvisaTemplateSeed;

module.exports = {
  defaultSuperAdmin,
  defaultEmailTemplates,
  defaultVisaTemplate,
};
