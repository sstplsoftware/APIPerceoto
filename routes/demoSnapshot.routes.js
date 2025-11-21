const express = require("express");
const router = express.Router();
const {
  uploadMdw,
  saveSnapshot,
  listSnapshots,
  deleteSnapshot,
} = require("../controllers/demoSnapshot.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// candidate will hit this every ~10s from webcam
router.post(
  "/upload",
  verifyToken,
  uploadMdw,
  saveSnapshot
);

// demo admin views all snapshots
router.get(
  "/all",
  verifyToken,
  requireRole("demoadmin", "superadmin"),
  listSnapshots
);

// demo admin deletes a snapshot
router.delete(
  "/:id",
  verifyToken,
  requireRole("demoadmin", "superadmin"),
  deleteSnapshot
);

module.exports = router;
