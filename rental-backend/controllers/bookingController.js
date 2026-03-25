const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.*, p.name as product_name, u.fullname as customer_name
       FROM bookings b
       JOIN products p ON p.id = b.product_id
       JOIN users u ON u.id = b.user_id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch bookings.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { user_id, product_id, rental_date, return_date, qty } = req.body;
    if (!user_id || !product_id || !rental_date || !return_date || !qty) {
      return res.status(400).json({ message: 'Missing booking fields.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO bookings (user_id, product_id, rental_date, return_date, qty, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, product_id, rental_date, return_date, qty, 'pending']
    );

    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot create booking.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status required.' });

    const [result] = await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Booking not found.' });
    const [rows] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot update booking status.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot delete booking.' });
  }
};
