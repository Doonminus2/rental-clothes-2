const db = require('../config/db');

// GET /api/dashboard
async function getStats(req, res) {
  try {
    const [[products]]  = await db.query("SELECT COUNT(*) AS total FROM products WHERE is_deleted=0");
    const [[customers]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role='customer'");
    const [[bookings]]  = await db.query("SELECT COUNT(*) AS total FROM bookings WHERE MONTH(created_at)=MONTH(NOW())");
    const [[pending]]   = await db.query("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('waiting','packing')");
    const [[revenue]]   = await db.query("SELECT COALESCE(SUM(total_price),0) AS total FROM bookings WHERE status='received' AND MONTH(created_at)=MONTH(NOW())");

    const [statusCounts] = await db.query(
      `SELECT status, COUNT(*) AS count FROM bookings
       WHERE MONTH(created_at)=MONTH(NOW()) GROUP BY status`
    );

    const [recentBookings] = await db.query(
      `SELECT b.id, b.status, b.rental_start, b.rental_end, b.total_price,
              u.full_name, p.name AS product_name
       FROM bookings b
       JOIN users u    ON b.user_id    = u.id
       JOIN products p ON b.product_id = p.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    const [popularProducts] = await db.query(
      `SELECT p.id, p.name, p.price_per_day, COUNT(b.id) AS rental_count
       FROM products p
       LEFT JOIN bookings b ON p.id = b.product_id
       WHERE p.is_deleted = 0
       GROUP BY p.id ORDER BY rental_count DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_products:  products.total,
        total_customers: customers.total,
        monthly_orders:  bookings.total,
        pending_orders:  pending.total,
        monthly_revenue: revenue.total,
        status_breakdown: statusCounts,
        recent_bookings:  recentBookings,
        popular_products: popularProducts,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

module.exports = { getStats };