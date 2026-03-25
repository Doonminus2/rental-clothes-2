const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/bookingController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer   = require('multer');
const path     = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || 'uploads/'),
  filename:    (req, file, cb) => cb(null, 'slip_' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get('/',    authMiddleware, ctrl.getAll);
router.get('/:id', authMiddleware, ctrl.getOne);
router.post('/',   authMiddleware, ctrl.create);
router.patch('/:id/status', authMiddleware, adminOnly, ctrl.updateStatus);
router.post('/:id/payment-proof', authMiddleware, upload.single('slip'), ctrl.uploadPaymentProof);

module.exports = router;