const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

router.get('/', authMiddleware, adminOnly, customerController.getAll);
router.get('/:id', authMiddleware, adminOnly, customerController.getById);
router.put('/:id', authMiddleware, adminOnly, customerController.update);
router.delete('/:id', authMiddleware, adminOnly, customerController.delete);

module.exports = router;
