// ===============================================
// 🧩 Snapshot Controller (Fixed)
// ===============================================

const Snapshot = require("../models/Snapshot");
const path = require("path");
const fs = require("fs");

/* -----------------------------
   📸 UPLOAD SNAPSHOT FRAME
------------------------------ */
const uploadFrame = async (req, res) => {
  try {
    const { email, name, batchNumber } = req.body;
    const screenFile = req.files?.image?.[0];
const faceFile = req.files?.face?.[0];

if (!screenFile && !faceFile) {
  return res.status(400).json({ error: "No image uploaded" });
}

const imageUrl = screenFile
  ? `/uploads/snapshots/${screenFile.filename}`
  : null;

const faceImageUrl = faceFile
  ? `/uploads/snapshots/${faceFile.filename}`
  : null;

    // ✅ Handle ownership logic properly
    // If candidate uploads, use their admin's ID (req.user.createdBy)
    // If admin uploads, use their own ID
    const creatorId = req.user.createdBy || req.user.id;

    const snapshot = new Snapshot({
  email,
  name,
  batchNumber,
  imageUrl,
  faceImageUrl,
  createdBy: creatorId,
  timestamp: new Date(),
});

    await snapshot.save();
    res.status(200).json({ message: "Snapshot saved", snapshot });
  } catch (err) {
    console.error("❌ Snapshot upload error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* -----------------------------
   🧠 FETCH ALL SNAPSHOTS
------------------------------ */
const getAllSnapshots = async (req, res) => {
  try {
    let filter = {};

    // ✅ Superadmin sees everything
    if (req.user.role === "superadmin") {
      filter = {}; // no restriction
    }

    // ✅ Admin sees only their own snapshots
    else if (req.user.role === "admin") {
      filter.createdBy = req.user.id;
    }

    // ✅ Candidate sees only their own snapshots (optional)
    else if (req.user.role === "candidate") {
      filter.email = req.user.email;
    }

    const snapshots = await Snapshot.find(filter)
      .sort({ timestamp: -1 })
      .select("email name batchNumber imageUrl timestamp createdBy");

    res.json(snapshots);
  } catch (err) {
    console.error("❌ getAllSnapshots error:", err);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
};

/* -----------------------------
   🧩 FETCH SNAPSHOTS BY EMAIL
------------------------------ */
const getSnapshotsByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    let filter = { email };

    // ✅ Superadmin sees all
    if (req.user.role === "superadmin") {
      // no need to modify filter
    }
    // ✅ Admin restricted to their snapshots
    else if (req.user.role === "admin") {
      filter.createdBy = req.user.id;
    }

    const snapshots = await Snapshot.find(filter)
      .sort({ timestamp: -1 })
      .select("email name batchNumber imageUrl timestamp createdBy");

    res.json(snapshots);
  } catch (err) {
    console.error("❌ Fetching snapshots failed:", err);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
};

module.exports = { uploadFrame, getAllSnapshots, getSnapshotsByEmail };
