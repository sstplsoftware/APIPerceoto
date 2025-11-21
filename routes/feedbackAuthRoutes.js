const express = require("express");
const {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/feedbackAuthController");

const router = express.Router();

router.post("/register", register);
router.get("/verify/:token", verifyEmail); // ✅ link click
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
