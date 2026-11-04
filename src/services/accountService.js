const User = require('../models/User');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

const accountModels = { user: User, admin: Admin, driver: Driver };

function modelForRole(role) {
  return accountModels[role] || null;
}

async function findByRoleAndId(role, id, projection) {
  const Model = modelForRole(role);
  return Model ? Model.findById(id).select(projection || '') : null;
}

async function findByEmail(email) {
  const normalized = String(email).toLowerCase().trim();
  const [admin, driver, user] = await Promise.all([
    Admin.findOne({ email: normalized }),
    Driver.findOne({ email: normalized }),
    User.findOne({ email: normalized }),
  ]);
  return admin || driver || user;
}

module.exports = { User, Admin, Driver, modelForRole, findByRoleAndId, findByEmail };
