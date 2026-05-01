const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db');
const { sendWelcomeEmail } = require('../notifications');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/signup
async function signup(req, res) {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES (?,?,?,?)',
      [name.trim(), email.toLowerCase().trim(), hashed, phone || null]
    );

    const user  = { id: result.insertId, name: name.trim(), email: email.toLowerCase().trim() };
    const token = signToken(user);

    // Send welcome email async (don't block response)
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(err =>
      console.error('Welcome email failed:', err.message)
    );

    res.status(201).json({ message: 'Account created.', token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!rows.length)
      return res.status(401).json({ error: 'No account found with this email.' });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Incorrect password.' });

    const token = signToken(user);
    res.json({
      message: 'Logged in.',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, sms_alerts: user.sms_alerts },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, sms_alerts, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
}

// PUT /api/auth/profile  — update phone number + SMS alerts preference
async function updateProfile(req, res) {
  const { phone, sms_alerts } = req.body;
  try {
    await pool.query(
      'UPDATE users SET phone = ?, sms_alerts = ? WHERE id = ?',
      [phone || null, sms_alerts ? 1 : 0, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

module.exports = { signup, login, getMe, updateProfile };
