const User = require('../models/User');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

// The original project kept all account roles in users. Move only admin and
// driver records, preserving their _ids so existing Bus.driver references stay valid.
async function migrateRoleAccounts() {
  const legacyAccounts = await User.collection.find({ role: { $in: ['admin', 'driver'] } }).toArray();
  let adminsMoved = 0;
  let driversMoved = 0;

  for (const account of legacyAccounts) {
    if (account.role === 'admin') {
      const exists = await Admin.exists({ _id: account._id });
      if (!exists) {
        await Admin.collection.insertOne({ ...account, role: 'admin' });
        adminsMoved += 1;
      }
    }
    if (account.role === 'driver') {
      const exists = await Driver.exists({ _id: account._id });
      if (!exists) {
        const names = String(account.fullName || '').trim().split(/\s+/);
        await Driver.collection.insertOne({
          ...account,
          firstName: account.firstName || names[0] || 'Driver',
          lastName: account.lastName || names.slice(1).join(' ') || 'Account',
          role: 'driver',
        });
        driversMoved += 1;
      }
    }
  }

  if (legacyAccounts.length) {
    await User.deleteMany({ _id: { $in: legacyAccounts.map((account) => account._id) } });
  }

  if (adminsMoved || driversMoved) {
    console.log(`✅ Account migration complete: ${adminsMoved} admin(s), ${driversMoved} driver(s) moved to separate collections.`);
  }
}

module.exports = { migrateRoleAccounts };
