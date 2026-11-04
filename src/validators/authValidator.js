// Validation rules extracted from route handlers (SRP, DRY).
const { ValidationError } = require('../errors/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(body) {
  const { fullName, email, password, confirmPassword } = body;
  if (!fullName || !email || !password) {
    throw new ValidationError('Name, email and password are required.');
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError('Please enter a valid email address.');
  }
  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters.');
  }
  if (confirmPassword && password !== confirmPassword) {
    throw new ValidationError('Passwords do not match.');
  }
}

function validateLogin(body) {
  const { email, password } = body;
  if (!email || !password) {
    throw new ValidationError('Email and password are required.');
  }
}

module.exports = { validateRegistration, validateLogin };
