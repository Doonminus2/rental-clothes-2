// routes/auth.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

/**
 * 🔐 Authentication Routes
 * ---------------------------------------
 * POST /api/auth/register - ลงทะเบียนผู้ใช้ใหม่
 * POST /api/auth/login    - เข้าสู่ระบบ (ต้องคืนค่า token และ userRole)
 * GET  /api/auth/me       - ดึงข้อมูลโปรไฟล์ตัวเอง
 * PUT  /api/auth/me       - แก้ไขข้อมูลโปรไฟล์ตัวเอง
 */

// 📝 ลงทะเบียน
router.post('/register', ctrl.register);

// 🔑 เข้าสู่ระบบ 
// 💡 สำคัญ: ใน authController.login ต้องส่ง { success: true, token, username, role: "admin" } กลับมานะโฟล์ค
router.post('/login', ctrl.login);

// 👤 ข้อมูลส่วนตัว (ต้องผ่าน Middleware ตรวจสอบ Token)
router.get('/me', authMiddleware, ctrl.getMe);
router.put('/me', authMiddleware, ctrl.updateMe);

module.exports = router;