const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const productController = require('../controllers/productController');

router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', authMiddleware, adminOnly, productController.create);
router.put('/:id', authMiddleware, adminOnly, productController.update);
router.delete('/:id', authMiddleware, adminOnly, productController.remove);

module.exports = router;
