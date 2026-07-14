/**
 * Seed demo visa applications for Admin Panel (and Embassy) testing.
 *
 * Creates / upserts:
 *  - SA-SEED-ADMIN-PENDING     → status pending (Admin Applications inbox)
 *  - SA-SEED-ADMIN-DOCS        → status documents_required
 *  - SA-SEED-EMBASSY-REVIEW    → status sent_to_embassy (DXB inbox)
 *
 * Prerequisites: run `npm run seed` first (visa types + DXB + admin).
 *
 * Usage:
 *   npm run seed:application
 *   node seed/seedApplication.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Applicant = require('../src/models/Applicant');
const Application = require('../src/models/Application');
const Embassy = require('../src/models/Embassy');
const VisaType = require('../src/models/VisaType');
const Staff = require('../src/models/Staff');
const { APPLICATION_STATUSES } = require('../src/config/statusWorkflow');

function maskUri(uri) {
  if (!uri) return '(missing)';
  return uri.replace(/\/\/([^:@]+):([^@]+)@/, '//$1:***@');
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertApplicant({ email, firstName, lastName, phone, nationality, sex, dob, staff }) {
  return Applicant.findOneAndUpdate(
    { email },
    {
      $set: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        phone,
        nationality,
        countryOfResidence: nationality,
        dateOfBirth: dob,
        sex,
        isActive: true,
        createdVia: 'admin_manual',
        ...(staff ? { createdByStaff: staff._id } : {}),
      },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertApplication({
  referenceId,
  applicant,
  visaType,
  status,
  source,
  personal,
  passport,
  travel,
  embassy,
  staff,
  paymentStatus,
  submittedAt,
  sentToEmbassyAt,
  documentRequestNote,
  requestedDocuments,
  formAnswers,
  note,
}) {
  const now = new Date();
  const payload = {
    applicant: applicant._id,
    visaTypeCode: visaType.code,
    channel: visaType.channel,
    status,
    source,
    personal,
    passport,
    travel,
    embassy: embassy?._id,
    assignedCaseManager: staff?._id,
    formAnswers: formAnswers || { previous_visits: 'none' },
    paymentStatus: paymentStatus || 'paid',
    submittedAt: submittedAt || now,
    sentToEmbassyAt,
    documentRequestNote,
    requestedDocuments: requestedDocuments || [],
    isArchived: false,
    createdByStaff: staff?._id,
    activity: [
      {
        action: 'seeded',
        toStatus: status,
        note: note || `Demo application seeded (${status})`,
        actorType: 'system',
        actorName: 'seed',
        at: now,
      },
    ],
  };

  let application = await Application.findOne({ referenceId });
  if (application) {
    Object.assign(application, payload);
    await application.save();
    return { application, created: false };
  }

  application = await Application.create({ referenceId, ...payload });
  return { application, created: true };
}

async function seedApplications() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing. Set it in backend/.env');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB: ${maskUri(uri)}`);
  await mongoose.connect(uri);
  console.log('Connected.');

  const evisa = await VisaType.findOne({ code: 'evisa_tourist', isActive: true });
  const embassyTourist = await VisaType.findOne({ code: 'embassy_tourist', isActive: true });
  if (!evisa || !embassyTourist) {
    throw new Error('Visa types missing. Run `npm run seed` first.');
  }

  const embassy = await Embassy.findOne({ code: 'DXB', isActive: true });
  if (!embassy) {
    throw new Error('Embassy DXB not found. Run `npm run seed` first.');
  }

  const staff = await Staff.findOne({ email: 'admin@salaam.local', isActive: true });
  if (!staff) {
    console.warn('Warning: admin@salaam.local not found — apps will have no case manager.');
  }

  const amina = await upsertApplicant({
    email: 'demo.applicant@salaam.local',
    firstName: 'Amina',
    lastName: 'Rahimi',
    phone: '+971501234567',
    nationality: 'AE',
    sex: 'female',
    dob: new Date('1992-04-18'),
    staff,
  });

  const karim = await upsertApplicant({
    email: 'demo.karim@salaam.local',
    firstName: 'Karim',
    lastName: 'Hassan',
    phone: '+971509876543',
    nationality: 'AE',
    sex: 'male',
    dob: new Date('1988-11-02'),
    staff,
  });

  const fatima = await upsertApplicant({
    email: 'demo.fatima@salaam.local',
    firstName: 'Fatima',
    lastName: 'Al Noor',
    phone: '+971507112233',
    nationality: 'AE',
    sex: 'female',
    dob: new Date('1995-07-22'),
    staff,
  });

  const results = [];

  // ── Admin Panel: pending ──────────────────────────────────────────────────
  {
    const { application, created } = await upsertApplication({
      referenceId: 'SA-SEED-ADMIN-PENDING',
      applicant: amina,
      visaType: evisa,
      status: APPLICATION_STATUSES.PENDING,
      source: 'website',
      personal: {
        fullName: 'Amina Rahimi',
        email: amina.email,
        phone: amina.phone,
        dateOfBirth: amina.dateOfBirth,
        sex: 'female',
        nationality: 'AE',
        countryOfResidence: 'AE',
      },
      passport: {
        fullName: 'Amina Rahimi',
        passportNumber: 'A12345678',
        nationality: 'AE',
        dateOfBirth: amina.dateOfBirth,
        sex: 'female',
        issueDate: new Date('2020-01-15'),
        expiryDate: new Date('2030-01-14'),
        issuingCountry: 'AE',
        ocrSource: 'manual',
      },
      travel: {
        purpose: 'Tourism — visit Kabul and cultural sites',
        intendedEntryDate: daysFromNow(45),
        intendedExitDate: daysFromNow(60),
        stayDurationDays: 15,
        addressInAfghanistan: 'Guest house, Wazir Akbar Khan, Kabul',
        citiesToVisit: 'Kabul, Bamyan',
        processingSpeed: 'standard',
      },
      formAnswers: { previous_visits: 'none', occupation: 'Marketing manager' },
      embassy,
      staff,
      note: 'Admin Panel demo — pending review',
    });
    results.push({ panel: 'admin', created, referenceId: application.referenceId, status: application.status });
  }

  // ── Admin Panel: documents required ───────────────────────────────────────
  {
    const { application, created } = await upsertApplication({
      referenceId: 'SA-SEED-ADMIN-DOCS',
      applicant: karim,
      visaType: evisa,
      status: APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
      source: 'admin_manual',
      personal: {
        fullName: 'Karim Hassan',
        email: karim.email,
        phone: karim.phone,
        dateOfBirth: karim.dateOfBirth,
        sex: 'male',
        nationality: 'AE',
        countryOfResidence: 'AE',
      },
      passport: {
        fullName: 'Karim Hassan',
        passportNumber: 'B99887766',
        nationality: 'AE',
        dateOfBirth: karim.dateOfBirth,
        sex: 'male',
        issueDate: new Date('2019-06-01'),
        expiryDate: new Date('2029-05-31'),
        issuingCountry: 'AE',
        ocrSource: 'manual',
      },
      travel: {
        purpose: 'Business meetings in Kabul',
        intendedEntryDate: daysFromNow(30),
        intendedExitDate: daysFromNow(40),
        stayDurationDays: 10,
        addressInAfghanistan: 'Serena Hotel, Kabul',
        citiesToVisit: 'Kabul',
        processingSpeed: 'express',
      },
      formAnswers: { previous_visits: 'none', occupation: 'Engineer' },
      embassy,
      staff,
      documentRequestNote: 'Please upload a clearer passport bio page and a hotel booking.',
      requestedDocuments: [
        {
          name: 'Passport bio page',
          key: 'passport_bio',
          status: 'pending',
          note: 'Higher resolution scan required',
          requestedAt: new Date(),
          requestedBy: staff?._id,
        },
        {
          name: 'Hotel booking confirmation',
          key: 'hotel_booking',
          status: 'pending',
          requestedAt: new Date(),
          requestedBy: staff?._id,
        },
      ],
      note: 'Admin Panel demo — documents required',
    });
    results.push({ panel: 'admin', created, referenceId: application.referenceId, status: application.status });
  }

  // ── Embassy Panel: sent to embassy ────────────────────────────────────────
  {
    const { application, created } = await upsertApplication({
      referenceId: 'SA-SEED-EMBASSY-REVIEW',
      applicant: fatima,
      visaType: embassyTourist,
      status: APPLICATION_STATUSES.SENT_TO_EMBASSY,
      source: 'website',
      personal: {
        fullName: 'Fatima Al Noor',
        email: fatima.email,
        phone: fatima.phone,
        dateOfBirth: fatima.dateOfBirth,
        sex: 'female',
        nationality: 'AE',
        countryOfResidence: 'AE',
      },
      passport: {
        fullName: 'Fatima Al Noor',
        passportNumber: 'C55443322',
        nationality: 'AE',
        dateOfBirth: fatima.dateOfBirth,
        sex: 'female',
        issueDate: new Date('2021-03-10'),
        expiryDate: new Date('2031-03-09'),
        issuingCountry: 'AE',
        ocrSource: 'manual',
      },
      travel: {
        purpose: 'Family visit',
        intendedEntryDate: daysFromNow(20),
        intendedExitDate: daysFromNow(35),
        stayDurationDays: 14,
        addressInAfghanistan: 'Relative residence, Herat',
        citiesToVisit: 'Herat',
        processingSpeed: 'standard',
      },
      formAnswers: { previous_visits: 'none', occupation: 'Teacher' },
      embassy,
      staff,
      sentToEmbassyAt: new Date(),
      note: 'Embassy Panel demo — sent to DXB',
    });
    results.push({ panel: 'embassy', created, referenceId: application.referenceId, status: application.status });
  }

  // Keep legacy single-id in sync for anyone still searching SA-SEED-PENDING
  const legacy = await Application.findOne({ referenceId: 'SA-SEED-PENDING' });
  if (legacy) {
    legacy.status = APPLICATION_STATUSES.PENDING;
    await legacy.save();
  }

  console.log('Seed applications complete.');
  console.table(results);
}

seedApplications()
  .catch((err) => {
    console.error('Seed application failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
