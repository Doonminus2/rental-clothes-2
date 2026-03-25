require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Ensure uploads directory exists ──
const uploadDir = process.env.UPLOAD_PATH || 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Middleware ──
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: serve uploaded files ──
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// ── Routes ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/customers', require('./routes/customers'));

// Dashboard (admin only)
const { authMiddleware, adminOnly } = require('./middleware/auth');
const { getStats } = require('./controllers/dashboardController');
app.get('/api/dashboard', authMiddleware, adminOnly, getStats);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Rental Clothes API is running 🚀', time: new Date() });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 API docs: GET /api/health`);
});