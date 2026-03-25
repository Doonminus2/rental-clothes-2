const db = require('../config/db');

// GET /api/customers
async function getAll(req, res) {
  const { tier, search, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = "WHERE u.role = 'customer'";

  if (search) {
    where += ' AND (u.full_name LIKE ? OR u.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tier === 'vip')       { where += ' AND u.rental_count >= 5'; }
  else if (tier === 'new')  { where += ' AND u.rental_count = 1'; }
  else if (tier === 'regular') { where += ' AND u.rental_count BETWEEN 2 AND 4'; }

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.address,
              u.rental_count, u.total_spent, u.late_count, u.is_blacklisted, u.created_at,
              CASE
                WHEN u.rental_count >= 5 THEN 'vip'
                WHEN u.rental_count >= 2 THEN 'regular'
                ELSE 'new'
              END AS tier
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM users u ${where}`, params
    );
    res.json({ success: true, data: rows, total, page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/customers/:id
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT u.*, 
              (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS booking_count
       FROM users u WHERE u.id = ? AND u.role = 'customer'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบลูกค้า' });

    const [history] = await db.query(
      `SELECT b.*, p.name AS product_name FROM bookings b
       JOIN products p ON b.product_id = p.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    const { password: _, ...safeUser } = rows[0];
    res.json({ success: true, data: { ...safeUser, history } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PATCH /api/customers/:id/blacklist  (admin only)
async function toggleBlacklist(req, res) {
  const { blacklisted, reason } = req.body;
  try {
    await db.query(
      'UPDATE users SET is_blacklisted=?, blacklist_reason=? WHERE id=?',
      [blacklisted ? 1 : 0, reason || null, req.params.id]
    );
    const msg = blacklisted ? 'ขึ้น Blacklist สำเร็จ' : 'ถอด Blacklist สำเร็จ';
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

module.exports = { getAll, getOne, toggleBlacklist };