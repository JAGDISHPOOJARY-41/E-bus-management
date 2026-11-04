// Controllers — translate HTTP <-> service calls only (SRP). No business rules here.
const config = require('../config');
const { ValidationError } = require('../errors/AppError');
const { validateRegistration, validateLogin } = require('../validators/authValidator');
const userService = require('../services/userService');
const { signToken } = require('../services/tokenService');
const logger = require('../utils/logger');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: config.jwt.cookieMaxAgeMs,
  });
}

async function register(req, res, next) {
  try {
    const { fullName, email, phone, city, password, confirmPassword } = req.body;
    validateRegistration({ fullName, email, password, confirmPassword });

    const user = await userService.registerUser({ fullName, email, phone, city, password });
    setAuthCookie(res, signToken(user));

    res.status(201).json({
      success: true,
      message: `Welcome to Wayfinder, ${userService.firstName(user.fullName)}!`,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err?.stack || err);
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    validateLogin({ email, password });

    const user = await userService.authenticateUser(email, password);
    setAuthCookie(res, signToken(user));
    if (user.role === 'admin') logger.info('Admin login', user.email);
    if (user.role === 'driver') logger.info('Driver login', user.email);

    res.json({
      success: true,
      message: `Welcome back, ${userService.firstName(user.fullName)}!`,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

async function registerDriver(req, res, next) {
  try {
    const { firstName, lastName, email, phone, travelAgency, password } = req.body;
    if (![firstName, lastName, email, phone, travelAgency, password].every((value) => String(value || '').trim())) throw new ValidationError('Please fill all required fields.');
    if (!emailPattern.test(email)) throw new ValidationError('Please enter a valid email address.');
    if (password.length < 6) throw new ValidationError('Password must be at least 6 characters.');
    const user = await userService.registerDriver({ firstName, lastName, email, phone, travelAgency, password });
    logger.info('Driver registered', user.email);
    res.status(201).json({ success: true, message: 'Driver registered successfully. Please log in.' });
  } catch (err) { next(err); }
}

async function getUser(req, res, next) {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { fullName, phone, city } = req.body;
    const user = await userService.updateProfile(req.user.id, { fullName, phone, city });
    res.json({ success: true, message: 'Profile updated ✓', user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(config.cookieName);
  logger.info('User logout');
  res.json({ success: true, message: 'Signed out successfully.' });
}

module.exports = { register, registerDriver, login, getUser, updateUser, logout };
