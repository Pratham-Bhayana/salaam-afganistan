const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Salaam Afghanistan API running on http://localhost:${PORT}`);
    console.log(`Docs index: http://localhost:${PORT}/api/v1`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
