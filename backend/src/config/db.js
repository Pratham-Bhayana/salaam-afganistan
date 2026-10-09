const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Set it in backend/.env');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(
    `MongoDB connected: host=${mongoose.connection.host} db=${mongoose.connection.name}`
  );
}

module.exports = { connectDB };
