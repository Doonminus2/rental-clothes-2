const db = require('../config/db');

// GET /api/products  (with filter/search)
async function getAll(req, res) {
  const { category, occasion, search, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE p.is_deleted = 0';

  if (category) { where += ' AND p.category = ?'; params.push(category); }
  if (occasion)  { where += ' AND p.occasion = ?';  params.push(occasion); }
  if (search)    { where += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM products p ${where}`, params
    );
    const [rows] = await db.query(
      `SELECT p.*, GROUP_CONCAT(pi.image_url) AS images
       FROM products p
       LEFT JOIN product_images pi ON p.id = pi.product_id
       ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    rows.forEach(r => {
      r.images = r.images ? r.images.split(',') : [];
    });

    res.json({ success: true, data: rows, total, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/products/:id
async function getOne(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT p.*, GROUP_CONCAT(pi.image_url) AS images
       FROM products p
       LEFT JOIN product_images pi ON p.id = pi.product_id
       WHERE p.id = ? AND p.is_deleted = 0
       GROUP BY p.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
    const product = rows[0];
    product.images = product.images ? product.images.split(',') : [];
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/products  (admin only)
async function create(req, res) {
  const { name, description, category, occasion, price_per_day, deposit, stock, sizes } = req.body;
  if (!name || !price_per_day) {
    return res.status(400).json({ success: false, message: 'ชื่อสินค้าและราคาเช่าต้องระบุ' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO products (name, description, category, occasion, price_per_day, deposit, stock, sizes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, category, occasion, price_per_day, deposit || 0, stock || 1, sizes || null]
    );

    // Save uploaded images
    if (req.files?.length) {
      const imageValues = req.files.map(f => [result.insertId, f.filename]);
      await db.query('INSERT INTO product_images (product_id, image_url) VALUES ?', [imageValues]);
    }

    res.status(201).json({ success: true, message: 'เพิ่มสินค้าสำเร็จ', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PUT /api/products/:id  (admin only)
async function update(req, res) {
  const { name, description, category, occasion, price_per_day, deposit, stock, sizes } = req.body;
  try {
    await db.query(
      `UPDATE products SET name=?, description=?, category=?, occasion=?, price_per_day=?, deposit=?, stock=?, sizes=?
       WHERE id=? AND is_deleted=0`,
      [name, description, category, occasion, price_per_day, deposit, stock, sizes, req.params.id]
    );
    res.json({ success: true, message: 'อัปเดตสินค้าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดขึ้น' });
  }
}

// DELETE /api/products/:id  (admin only — soft delete)
async function remove(req, res) {
  try {
    await db.query('UPDATE products SET is_deleted=1 WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

module.exports = { getAll, getOne, create, update, remove };