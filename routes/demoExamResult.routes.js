const express = require("express");
const router = express.Router();
const {
  submitDemoResult,
  getDemoResults,
} = require("../controllers/demoExamResult.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// Candidate submits exam
router.post(
  "/submit",
  verifyToken, // will set req.user to that candidate
  submitDemoResult
);

// Demo admin views results
router.get(
  "/all",
  verifyToken,
  requireRole("demoadmin", "superadmin"), // allow superadmin too
  getDemoResults
);

module.exports = router;
