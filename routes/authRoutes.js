// ===============================================
// 🧩 AUTH ROUTES (Fixed for SuperAdmin → Admin Creation)
// ===============================================

const express = require("express");
const router = express.Router();
const { register, login, resetPassword } = require("../controllers/authController");
const { verifyToken, requireSuperAdmin } = require("../middleware/auth");

/* =========================================================
   ✅ AUTH ROUTES
========================================================= */

// 🔹 Only Super Admins can register Admins or Demo Admins
router.post("/register", verifyToken, requireSuperAdmin, register);

// 🔹 Login route (public)
router.post("/login", login);

// 🔹 Reset password (protected)
router.post("/reset-password", verifyToken, resetPassword);

// 🔹 Get current user info (protected)
router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
