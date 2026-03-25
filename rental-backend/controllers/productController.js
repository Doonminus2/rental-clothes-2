const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch products.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch product.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price are required.' });

    const [result] = await pool.execute(
      'INSERT INTO products (name, description, price, stock, category) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', price, stock || 0, category || '']
    );

    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot create product.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const [result] = await pool.execute(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ? WHERE id = ?',
      [name, description, price, stock, category, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found.' });
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot update product.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot delete product.' });
  }
};
