const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Set it in backend/.env');
  process.exit(1);
}

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

function redactSecrets(value) {
  return String(value).replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]');
}

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Salaam Afghanistan API running on http://localhost:${PORT}`);
    console.log(`Docs index: http://localhost:${PORT}/api/v1`);
  });
}

start().catch((err) => {
  const message = err && err.message ? err.message : err;
  console.error('Failed to start server:', redactSecrets(message));
  process.exit(1);
});
