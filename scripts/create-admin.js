// Create or update one local admin account without printing its password.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../src/models/Admin');
const config = require('../src/config');

const [email, password, fullName = 'System Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 6) {
  console.error('Usage: node scripts/create-admin.js <email> <password> [full name]');
  process.exit(1);
}

(async () => {
  await mongoose.connect(config.mongoUri);
  await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { fullName, email: email.toLowerCase(), password: await bcrypt.hash(password, config.bcryptRounds), role: 'admin', active: true } },
    { upsert: true, new: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`Admin account ready for ${email.toLowerCase()}`);
  await mongoose.disconnect();
})().catch((error) => { console.error('Could not create admin:', error.message); process.exit(1); });
