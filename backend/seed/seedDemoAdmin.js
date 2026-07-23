/**
 * One-shot: upsert the demo admin panel super admin.
 * Safe to re-run (upserts by email).
 *
 * Usage:
 *   npm run seed:demo-admin
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('../src/config/db');
const Staff = require('../src/models/Staff');
const { ROLES } = require('../src/config/permissions');

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'demoadmin@afghanistan.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Demo@1234';

  await connectDB();

  const passwordHash = await Staff.hashPassword(password);
  const admin = await Staff.findOneAndUpdate(
    { email },
    {
      $set: {
        firstName: 'Demo',
        lastName: 'Admin',
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        passwordHash,
      },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Demo admin ready:');
  console.log(`  email:    ${admin.email}`);
  console.log(`  password: ${password}`);
  console.log(`  role:     ${admin.role}`);
  console.log(`  id:       ${admin._id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedDemoAdmin failed:', err);
    process.exit(1);
  });
