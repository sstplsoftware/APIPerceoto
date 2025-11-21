const express = require("express");
const router = express.Router();
const { registerDemoCandidate, loginDemoCandidate } = require("../controllers/demoExamAuth.controller");

router.post("/register", registerDemoCandidate);
router.post("/login", loginDemoCandidate);

module.exports = router;
