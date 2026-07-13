/**
 * Seed script for Salaam Afghanistan.
 *
 * Seeds:
 *  - Visa config (types, eligibility, docs, fields, fees)
 *  - Super admin staff account
 *  - Platform settings, email templates, default visa template
 *
 * Uses MONGODB_URI from backend/.env (local or Atlas).
 *
 * Usage:
 *   npm run seed
 *   npm run seed:fresh
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const VisaType = require('../src/models/VisaType');
const EligibilityRule = require('../src/models/EligibilityRule');
const DocumentRequirement = require('../src/models/DocumentRequirement');
const FormField = require('../src/models/FormField');
const FeeRule = require('../src/models/FeeRule');
const Staff = require('../src/models/Staff');
const PlatformSettings = require('../src/models/PlatformSettings');
const EmailTemplate = require('../src/models/EmailTemplate');
const VisaTemplate = require('../src/models/VisaTemplate');
const Embassy = require('../src/models/Embassy');
const EmbassyStaff = require('../src/models/EmbassyStaff');
const ChatRoom = require('../src/models/ChatRoom');
const { EMBASSY_ROLES } = require('../src/config/embassyPermissions');

const visaTypes = require('./data/visaTypes');
const eligibilityRules = require('./data/eligibilityRules');
const documentRequirements = require('./data/documentRequirements');
const formFields = require('./data/formFields');
const feeRules = require('./data/feeRules');
const {
  defaultSuperAdmin,
  defaultEmailTemplates,
  defaultVisaTemplate,
} = require('./data/adminBootstrap');

const isFresh = process.argv.includes('--fresh');

function maskUri(uri) {
  if (!uri) return '(missing)';
  return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//$1:***@');
}

async function upsertMany(Model, rows, filterFn) {
  let upserted = 0;
  for (const row of rows) {
    const filter = filterFn(row);
    await Model.findOneAndUpdate(filter, { $set: row }, { upsert: true, new: true, setDefaultsOnInsert: true });
    upserted += 1;
  }
  return upserted;
}

async function clearConfigCollections() {
  await Promise.all([
    VisaType.deleteMany({}),
    EligibilityRule.deleteMany({}),
    DocumentRequirement.deleteMany({}),
    FormField.deleteMany({}),
    FeeRule.deleteMany({}),
  ]);
  console.log('Cleared existing visa config collections (--fresh).');
}

async function seedAdminBootstrap() {
  const passwordHash = await Staff.hashPassword(defaultSuperAdmin.password);
  const admin = await Staff.findOneAndUpdate(
    { email: defaultSuperAdmin.email.toLowerCase() },
    {
      $set: {
        firstName: defaultSuperAdmin.firstName,
        lastName: defaultSuperAdmin.lastName,
        role: defaultSuperAdmin.role,
        isActive: true,
        passwordHash,
      },
      $setOnInsert: {
        email: defaultSuperAdmin.email.toLowerCase(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await PlatformSettings.findOneAndUpdate(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        branding: {
          platformName: 'Salaam Afghanistan',
          primaryColor: '#0B3D2E',
          secondaryColor: '#C4A35A',
          supportEmail: 'support@salaam.local',
        },
      },
    },
    { upsert: true, new: true }
  );

  const emailCount = await upsertMany(EmailTemplate, defaultEmailTemplates, (r) => ({ code: r.code }));
  await VisaTemplate.findOneAndUpdate(
    { code: defaultVisaTemplate.code },
    { $set: defaultVisaTemplate },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    adminEmail: admin.email,
    adminRole: admin.role,
    emailTemplates: emailCount,
  };
}

async function seedEmbassyBootstrap() {
  const embassy = await Embassy.findOneAndUpdate(
    { code: 'DXB' },
    {
      $set: {
        name: 'Dubai Consulate',
        contact: {
          email: 'dubai@mfa.local',
          city: 'Dubai',
          country: 'AE',
        },
        jurisdictionCountries: ['AE', 'SA', 'QA'],
        supportedVisaTypeCodes: [
          'embassy_tourist',
          'embassy_business',
          'embassy_visit_family',
          'embassy_work',
        ],
        isActive: true,
      },
      $setOnInsert: { code: 'DXB' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ChatRoom.findOneAndUpdate(
    { embassy: embassy._id, type: 'general', application: null },
    {
      $setOnInsert: {
        embassy: embassy._id,
        type: 'general',
        title: `${embassy.name} — General Coordination`,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const email = process.env.SEED_EMBASSY_EMAIL || 'embassy.admin@salaam.local';
  const password = process.env.SEED_EMBASSY_PASSWORD || 'ChangeMeNow!123';
  const passwordHash = await EmbassyStaff.hashPassword(password);

  const embassyAdmin = await EmbassyStaff.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        embassy: embassy._id,
        firstName: 'Embassy',
        lastName: 'Admin',
        role: EMBASSY_ROLES.EMBASSY_ADMIN,
        accessMode: 'all',
        isActive: true,
        passwordHash,
      },
      $setOnInsert: { email: email.toLowerCase() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    embassyCode: embassy.code,
    embassyId: embassy._id,
    embassyAdminEmail: embassyAdmin.email,
  };
}

async function seed() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is missing. Set it in backend/.env');
    process.exit(1);
  }

  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.warn('WARNING: JWT secrets missing in .env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before running the API.');
  }

  console.log(`Connecting to MongoDB: ${maskUri(uri)}`);
  await mongoose.connect(uri);
  console.log('Connected.');

  if (isFresh) {
    await clearConfigCollections();
  }

  const counts = {
    visaTypes: await upsertMany(VisaType, visaTypes, (r) => ({ code: r.code })),
    eligibilityRules: await upsertMany(EligibilityRule, eligibilityRules, (r) => ({
      visaTypeCode: r.visaTypeCode,
    })),
    documentRequirements: await upsertMany(DocumentRequirement, documentRequirements, (r) => ({
      visaTypeCode: r.visaTypeCode,
      key: r.key,
    })),
    formFields: await upsertMany(FormField, formFields, (r) => ({
      visaTypeCode: r.visaTypeCode,
      key: r.key,
    })),
    feeRules: await upsertMany(FeeRule, feeRules, (r) => ({
      visaTypeCode: r.visaTypeCode,
      nationality: r.nationality,
      processing: r.processing,
      stage: r.stage,
    })),
  };

  const bootstrap = await seedAdminBootstrap();
  const embassyBootstrap = await seedEmbassyBootstrap();

  console.log('Seed complete.');
  console.log('Upserted config:', counts);
  console.log('Admin bootstrap:', {
    ...bootstrap,
    defaultPasswordHint: process.env.SEED_ADMIN_PASSWORD ? '(from SEED_ADMIN_PASSWORD)' : 'ChangeMeNow!123',
  });
  console.log('Embassy bootstrap:', {
    ...embassyBootstrap,
    defaultPasswordHint: process.env.SEED_EMBASSY_PASSWORD ? '(from SEED_EMBASSY_PASSWORD)' : 'ChangeMeNow!123',
  });
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
