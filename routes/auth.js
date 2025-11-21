// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, resetPassword } = require('../controllers/authController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ✅ Public login
router.post('/login', login);

// ✅ Register — open or protected (choose one)
// Option A: Public candidate registration
// router.post('/register', register);

// Option B: Protected admin/superadmin registration
router.post('/register', verifyToken, requireRole('superadmin', 'admin', 'demoadmin'), register);

// ✅ Password reset (protected)
router.post('/reset-password', verifyToken, resetPassword);

module.exports = router;
