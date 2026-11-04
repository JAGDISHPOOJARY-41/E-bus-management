// Wayfinder E-Bus — Express + MongoDB auth server
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'wayfinder_ebus_secret_key_2024';

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── MongoDB connection (database: E-bus, collection: users) ──
const MONGO_URI = 'mongodb://127.0.0.1:27017/E-bus';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB database: E-bus'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ── User model ──
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema); // collection "users" in db "E-bus"

// ── Helpers ──
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }
};

// ── Routes ──
// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, city, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email, phone, city, password: hashed });

    const token = jwt.sign({ id: user._id, name: user.fullName, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({ success: true, message: `Welcome to Wayfinder, ${user.fullName.split(' ')[0]}!`, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, name: user.fullName, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, message: `Welcome back, ${user.fullName.split(' ')[0]}!`, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Get current user (for profile page / dashboard)
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load profile.' });
  }
});

// Update profile
app.put('/api/user', authMiddleware, async (req, res) => {
  try {
    const { fullName, phone, city } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { fullName, phone, city } },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, message: 'Profile updated ✓', user });
  } catch {
    res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Signed out successfully.' });
});

app.listen(PORT, () => console.log(`🚌 Wayfinder running at http://localhost:${PORT}`));
