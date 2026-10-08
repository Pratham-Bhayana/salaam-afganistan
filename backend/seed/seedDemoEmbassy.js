/**
 * One-shot: upsert the demo embassy admin on whatever MONGODB_URI is configured.
 * Safe to re-run (upserts by email).
 *
 * Usage (Railway shell / one-off):
 *   npm run seed:demo-embassy
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('../src/config/db');
const Embassy = require('../src/models/Embassy');
const EmbassyStaff = require('../src/models/EmbassyStaff');
const ChatRoom = require('../src/models/ChatRoom');
const { EMBASSY_ROLES } = require('../src/config/embassyPermissions');

async function ensureEmbassyGeneralRoom(embassy) {
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
}

async function main() {
  const email = (process.env.SEED_EMBASSY_EMAIL || 'demoembassy@afghanistan.com').toLowerCase();
  const password = process.env.SEED_EMBASSY_PASSWORD || 'Demo@1234';

  await connectDB();

  const embassy = await Embassy.findOneAndUpdate(
    { code: 'DXB' },
    {
      $set: {
        name: 'Afghanistan Consulate General — Dubai',
        contact: {
          email: 'dubai@mfa.local',
          phone: '+971-4-000-0000',
          address: 'Dubai, UAE',
          city: 'Dubai',
          country: 'AE',
        },
        jurisdictionCountries: ['AE', 'IN', 'PK', 'BD', 'LK', 'NP'],
        supportedVisaTypeCodes: [
          'evisa_tourist',
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

  await ensureEmbassyGeneralRoom(embassy);

  const passwordHash = await EmbassyStaff.hashPassword(password);
  const staff = await EmbassyStaff.findOneAndUpdate(
    { email },
    {
      $set: {
        embassy: embassy._id,
        firstName: 'Demo',
        lastName: 'Embassy',
        role: EMBASSY_ROLES.EMBASSY_ADMIN,
        accessMode: 'all',
        isActive: true,
        passwordHash,
      },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Demo embassy admin ready:');
  console.log(`  email:    ${staff.email}`);
  console.log(`  password: ${password}`);
  console.log(`  role:     ${staff.role}`);
  console.log(`  embassy:  ${embassy.code} (${embassy.name})`);
  console.log(`  id:       ${staff._id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedDemoEmbassy failed:', err);
    process.exit(1);
  });
