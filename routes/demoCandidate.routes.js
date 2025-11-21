const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const ctrl = require("../controllers/demoCandidate.controller");

// ✅ CRUD endpoints for Demo Candidates (demo admin only)
router.get("/", verifyToken, ctrl.getAllDemoCandidates);
router.post("/", verifyToken, ctrl.createDemoCandidate);
router.delete("/:id", verifyToken, ctrl.deleteDemoCandidate);

// ✅ Public login endpoint (no token required)
router.post("/login", ctrl.demoCandidateLogin);

module.exports = router;
