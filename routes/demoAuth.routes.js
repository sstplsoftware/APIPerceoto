// routes/demoAuth.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/demoAuth.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// ===============================================
// 🧩 DEMO ACCESS REQUEST ROUTES
// ===============================================

// ✅ Public: Anyone can request demo access via form
router.post("/request-access", ctrl.requestAccessPlain);

// ✅ Protected: Only Super Admin can view/manage demo requests
router.get("/requests", verifyToken, requireRole("superadmin"), ctrl.getAllDemoRequests);
router.put("/requests/:id/activate", verifyToken, requireRole("superadmin"), ctrl.activateDemoRequest);
router.delete("/requests/:id", verifyToken, requireRole("superadmin"), ctrl.deleteDemoRequest);

module.exports = router;
