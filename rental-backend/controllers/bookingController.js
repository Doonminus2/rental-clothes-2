const db = require('../config/db');

// POST /api/bookings  — customer creates a booking
async function create(req, res) {
  const { product_id, rental_start, rental_end, size, quantity = 1, payment_method, shipping_address } = req.body;

  if (!product_id || !rental_start || !rental_end) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  try {
    // Check product availability
    const [prod] = await db.query(
      'SELECT * FROM products WHERE id = ? AND is_deleted = 0',
      [product_id]
    );
    if (!prod.length) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });

    const days = Math.ceil((new Date(rental_end) - new Date(rental_start)) / 86400000) + 1;
    const total_price    = prod[0].price_per_day * days * quantity;
    const deposit_amount = prod[0].deposit * quantity;

    const [result] = await db.query(
      `INSERT INTO bookings
         (user_id, product_id, rental_start, rental_end, size, quantity,
          total_price, deposit_amount, payment_method, shipping_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`,
      [req.user.id, product_id, rental_start, rental_end, size, quantity,
       total_price, deposit_amount, payment_method, shipping_address]
    );

    res.status(201).json({
      success: true,
      message: 'จองสำเร็จ',
      booking_id: result.insertId,
      total_price,
      deposit_amount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/bookings  — customer sees own bookings; admin sees all
async function getAll(req, res) {
  const { status, page = 1, limit = 10, month } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = req.user.role === 'admin' ? 'WHERE 1=1' : 'WHERE b.user_id = ?';
  if (req.user.role !== 'admin') params.push(req.user.id);
  if (status) { where += ' AND b.status = ?'; params.push(status); }
  if (month)  { where += ' AND MONTH(b.rental_start) = ?'; params.push(month); }

  try {
    const [rows] = await db.query(
      `SELECT b.*, u.full_name, u.phone, p.name AS product_name, p.price_per_day
       FROM bookings b
       JOIN users    u ON b.user_id    = u.id
       JOIN products p ON b.product_id = p.id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM bookings b ${where}`, params
    );
    res.json({ success: true, data: rows, total, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/bookings/:id
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.full_name, u.phone, u.email, u.address AS user_address,
              p.name AS product_name, p.price_per_day, p.deposit
       FROM bookings b
       JOIN users    u ON b.user_id    = u.id
       JOIN products p ON b.product_id = p.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบการจอง' });
    // Allow owner or admin
    const booking = rows[0];
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PATCH /api/bookings/:id/status  (admin only)
async function updateStatus(req, res) {
  const { status, tracking_number, shipping_carrier } = req.body;
  const allowed = ['waiting', 'packing', 'shipped', 'received', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }
  try {
    await db.query(
      'UPDATE bookings SET status=?, tracking_number=?, shipping_carrier=?, updated_at=NOW() WHERE id=?',
      [status, tracking_number || null, shipping_carrier || null, req.params.id]
    );
    res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/bookings/:id/payment-proof  — customer uploads slip
async function uploadPaymentProof(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์สลิป' });
  try {
    await db.query(
      'UPDATE bookings SET payment_proof=?, payment_status="paid" WHERE id=?',
      [req.file.filename, req.params.id]
    );
    res.json({ success: true, message: 'อัปโหลดสลิปสำเร็จ', file: req.file.filename });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

module.exports = { create, getAll, getOne, updateStatus, uploadPaymentProof };