const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, fullname, email, phone, address, isAdmin FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch customers.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, fullname, email, phone, address, isAdmin FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Customer not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch customer.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { fullname, phone, address } = req.body;
    const [result] = await pool.execute(
      'UPDATE users SET fullname = ?, phone = ?, address = ? WHERE id = ?',
      [fullname, phone, address, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found.' });
    const [rows] = await pool.execute('SELECT id, fullname, email, phone, address, isAdmin FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot update customer.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ message: 'Customer deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot delete customer.' });
  }
};
