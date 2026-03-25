// routes/auth.js
const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        authMiddleware, ctrl.getMe);
router.put('/me',        authMiddleware, ctrl.updateMe);

module.exports = router;