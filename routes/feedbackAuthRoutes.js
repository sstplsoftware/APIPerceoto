// routes/feedbackAuthRoutes.js

const express = require("express");
const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/feedbackAuthController");

const router = express.Router();

/* ================================
   FEEDBACK AUTH ROUTES (SendGrid)
================================ */

// 🔹 Register + send email verification
router.post("/register", register);

// 🔹 Email verification link
router.get("/verify/:token", verifyEmail);

// 🔹 Login (only allowed if verified)
router.post("/login", login);

// 🔹 Forgot password → sends reset link
router.post("/forgot-password", forgotPassword);

// 🔹 Reset password using token
router.post("/reset-password", resetPassword);

module.exports = router;
