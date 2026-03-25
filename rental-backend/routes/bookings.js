const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

router.get('/', authMiddleware, adminOnly, bookingController.getAll);
router.post('/', authMiddleware, bookingController.create);
router.patch('/:id/status', authMiddleware, adminOnly, bookingController.updateStatus);
router.delete('/:id', authMiddleware, adminOnly, bookingController.delete);

module.exports = router;
