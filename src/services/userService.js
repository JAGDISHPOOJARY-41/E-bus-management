// Business logic — no Express/HTTP knowledge (SRP). Thin controllers delegate here.
const { User, Driver, findByEmail, findByRoleAndId } = require('./accountService');
const { ConflictError, UnauthorizedError, AppError } = require('../errors/AppError');
const {
  hashPassword,
  comparePassword,
  signToken,
} = require('./tokenService');

function firstName(fullName) {
  return fullName.split(' ')[0];
}

async function registerUser({ fullName, email, phone, city, password }) {
  const existing = await findByEmail(email);
  if (existing) throw new ConflictError('An account with this email already exists.');

  const hashed = await hashPassword(password);
  return User.create({ fullName, email, phone, city, password: hashed });
}

async function registerDriver({ firstName, lastName, email, phone, travelAgency, password }) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await findByEmail(normalizedEmail);
  if (existing) throw new ConflictError('An account with this email already exists.');
  const hashed = await hashPassword(password);
  return Driver.create({ fullName: `${firstName.trim()} ${lastName.trim()}`, firstName: firstName.trim(), lastName: lastName.trim(), email: normalizedEmail, phone: phone.trim(), travelAgency: travelAgency.trim(), password: hashed, role: 'driver' });
}

async function authenticateUser(email, password) {
  const user = await findByEmail(email);
  if (!user || user.active === false || !(await comparePassword(password, user.password))) {
    throw new UnauthorizedError('Invalid email or password.');
  }
  return user;
}

async function getProfile(id) {
  const user = await User.findById(id).select('-password');
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

async function updateProfile(id, patch) {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

module.exports = { registerUser, registerDriver, authenticateUser, getProfile, updateProfile, firstName };
