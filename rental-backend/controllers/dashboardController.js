const pool = require('../config/db');

exports.stats = async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.execute('SELECT COUNT(*) AS total_users FROM users');
    const [[{ total_products }]] = await pool.execute('SELECT COUNT(*) AS total_products FROM products');
    const [[{ total_bookings }]] = await pool.execute('SELECT COUNT(*) AS total_bookings FROM bookings');

    res.json({ total_users, total_products, total_bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch dashboard stats.' });
  }
};
