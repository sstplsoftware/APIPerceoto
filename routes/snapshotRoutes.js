// routes/snapshotRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadFrame, getSnapshotsByEmail, getAllSnapshots } = require("../controllers/snapshotController");
const { verifyToken, isAdmin } = require("../middleware/auth");
const Snapshot = require("../models/Snapshot");

const router = express.Router();   // ✅ must be declared BEFORE any router.get/post

// Ensure uploads/snapshots directory exists
const uploadDir = path.join(__dirname, "../uploads/snapshots");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage (for /upload-frame)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

/* -----------------------------
   ROUTES
------------------------------ */

// ✅ Candidates upload frames
router.post("/upload-frame", verifyToken, upload.single("image"), uploadFrame);

// ✅ Admin fetch all snapshots (used by dashboard)
router.get("/snapshots", verifyToken, isAdmin, getAllSnapshots);

// ✅ Admin fetch snapshots for a specific candidate
router.get("/snapshots/:email", verifyToken, isAdmin, getSnapshotsByEmail);

/* -----------------------------
   HARD DELETE ENDPOINTS
------------------------------ */

function deleteFileIfExists(imageUrl) {
  try {
    if (!imageUrl) return;
    const filename = path.basename(imageUrl);
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn("Snapshot file delete warning:", err.message);
  }
}

// ✅ Delete one snapshot
router.delete("/snapshots/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const snap = await Snapshot.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!snap) return res.status(404).json({ error: "Snapshot not found or not owned by you" });

    deleteFileIfExists(snap.imageUrl);
    await snap.deleteOne();
    res.json({ message: "Snapshot deleted", id: req.params.id });
  } catch (err) {
    console.error("Delete snapshot error:", err);
    res.status(500).json({ error: "Failed to delete snapshot" });
  }
});

// ✅ Delete all snapshots for candidate
router.delete("/snapshots/byEmail/:email", verifyToken, isAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const snaps = await Snapshot.find({ email, createdBy: req.user.id });
    snaps.forEach((s) => deleteFileIfExists(s.imageUrl));
    const result = await Snapshot.deleteMany({ email, createdBy: req.user.id });
    res.json({ message: "Deleted snapshots for candidate", email, deleted: result.deletedCount });
  } catch (err) {
    console.error("Delete by email error:", err);
    res.status(500).json({ error: "Failed to delete candidate snapshots" });
  }
});

// ✅ Delete all snapshots for batch
router.delete("/snapshots/byBatch/:batchNumber", verifyToken, isAdmin, async (req, res) => {
  try {
    const batchNumber = decodeURIComponent(req.params.batchNumber);
    const snaps = await Snapshot.find({ batchNumber, createdBy: req.user.id });
    snaps.forEach((s) => deleteFileIfExists(s.imageUrl));
    const result = await Snapshot.deleteMany({ batchNumber, createdBy: req.user.id });
    res.json({ message: "Deleted snapshots for batch", batchNumber, deleted: result.deletedCount });
  } catch (err) {
    console.error("Delete by batch error:", err);
    res.status(500).json({ error: "Failed to delete batch snapshots" });
  }
});

module.exports = router;
