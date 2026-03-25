const db      = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// POST /api/auth/register
async function register(req, res) {
  const { username, email, password, full_name, phone, address } = req.body;

  if (!username || !email || !password || !full_name || !phone) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Username หรือ Email นี้ถูกใช้แล้ว' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (username, email, password, full_name, phone, address, role)
       VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
      [username, email, hashed, full_name, phone, address || null]
    );

    const token = generateToken({ id: result.insertId, username, role: 'customer' });
    res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' });
    }

    const user = rows[0];
    if (user.is_blacklisted) {
      return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, full_name, phone, address, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

// PUT /api/auth/me
async function updateMe(req, res) {
  const { email, full_name, phone, address, password } = req.body;
  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET email=?, full_name=?, phone=?, address=?, password=? WHERE id=?',
        [email, full_name, phone, address, hashed, req.user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET email=?, full_name=?, phone=?, address=? WHERE id=?',
        [email, full_name, phone, address, req.user.id]
      );
    }
    res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { register, login, getMe, updateMe };