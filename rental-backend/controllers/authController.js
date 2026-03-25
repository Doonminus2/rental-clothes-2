const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin === 1 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, fullname: user.fullname, isAdmin: user.isAdmin === 1 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed.' });
  }
};

exports.register = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: 'Fullname, email and password are required.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (fullname, email, password, isAdmin) VALUES (?, ?, ?, 0)',
      [fullname, email, hashed]
    );

    const [userRows] = await pool.execute('SELECT id, fullname, email, isAdmin FROM users WHERE id = ?', [result.insertId]);
    const user = userRows[0];
    const token = signToken(user);

    res.status(201).json({ token, user: { ...user, isAdmin: user.isAdmin === 1 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed.' });
  }
};
