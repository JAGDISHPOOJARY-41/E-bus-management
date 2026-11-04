// Database connection bootstrap (SRP).
const mongoose = require('mongoose');
const config = require('./index');
const { migrateRoleAccounts } = require('./migrateAccounts');

async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri);
    await migrateRoleAccounts();
    console.log('✅ Connected to MongoDB database: E-bus');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDatabase };
