// Token issuing/verification + password hashing — infrastructure concerns.
// Swap bcrypt/jwt for another provider here without touching services (OCP/DIP).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../errors/AppError');

async function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcryptRounds);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.fullName, email: user.email, role: user.role || 'user' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    throw new UnauthorizedError('Session expired, please log in again');
  }
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
