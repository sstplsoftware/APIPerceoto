const express = require("express");
const router = express.Router();

const {
  saveResult,
  getUserResults,
  getResultById,
} = require("../controllers/ResultAPIController");

// Save new assessment result
router.post("/", saveResult);

// Get all results of a user (userId OR userEmail)
router.get("/user/:userId", getUserResults);

// Get specific result for PDF page
router.get("/:resultId", getResultById);

module.exports = router;
