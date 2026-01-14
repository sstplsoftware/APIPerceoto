const path = require("path");
const fs = require("fs");
const multer = require("multer");
const DemoSnapshot = require("../models/demoSnapshot.model");
const DemoCandidate = require("../models/DemoCandidate.model");

// Storage for snapshots
const snapshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const p = path.join(__dirname, "../uploads/demo-snapshots");
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    cb(null, p);
  },
  filename: (req, file, cb) => {
    const uniq = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `snap_${uniq}.jpg`);
  },
});

const upload = multer({ storage: snapshotStorage });
exports.uploadMdw = upload.single("frame");

// =======================================
// ✅ Save Snapshot (Demo Candidate)
// =======================================
exports.saveSnapshot = async (req, res) => {
  try {
    const cand = req.user;
    if (!cand || cand.role !== "democandidate") {
      return res
        .status(403)
        .json({ error: "Only demo candidates may upload snapshots" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No frame received" });
    }

    // ✅ Find candidate to get createdBy (demo admin)
    const fullCand = await DemoCandidate.findById(cand._id).lean();
    const createdBy = fullCand?.createdBy || null;

    const imageUrl = `/uploads/demo-snapshots/${req.file.filename}`;

    // ✅ Save snapshot with createdBy field
    const snapDoc = await DemoSnapshot.create({
      candidate: cand._id,
      subjectId: cand.subjectId,
      subjectName: cand.subjectName || "",
      createdBy,
      imageUrl,
      takenAt: new Date(),
      meta: {
        tabWarnings: req.body.tabWarnings
          ? parseInt(req.body.tabWarnings, 10)
          : 0,
        strikeCount: req.body.strikeCount
          ? parseInt(req.body.strikeCount, 10)
          : 0,
      },
    });

    res.json({
      message: "Snapshot stored",
      snapshotId: snapDoc._id,
      imageUrl,
      takenAt: snapDoc.takenAt,
    });
  } catch (err) {
    console.error("❌ Snapshot upload error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =======================================
// ✅ List Snapshots (Demo Admin)
// =======================================
exports.listSnapshots = async (req, res) => {
  try {
    const me = req.user;
    if (!me || me.role !== "demoadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Filter by admin ownership
    const snaps = await DemoSnapshot.find({ createdBy: me._id })
      .populate("candidate", "name email candidateId")
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      snaps.map((s) => ({
        _id: s._id,
        candidateName: s.candidate?.name || "—",
        candidateEmail: s.candidate?.email || "—",
        candidateId: s.candidate?.candidateId || "—",
        subjectName: s.subjectName || "—",
        imageUrl: s.imageUrl,
        takenAt: s.takenAt,
        meta: s.meta || {},
      }))
    );
  } catch (err) {
    console.error("❌ Snapshot list error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =======================================
// ✅ Delete Snapshot
// =======================================
exports.deleteSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user;

    const snap = await DemoSnapshot.findOne({ _id: id, createdBy: me._id });
    if (!snap) return res.status(404).json({ error: "Not found or unauthorized" });

    // remove file from disk
    const absolutePath = path.join(
      __dirname,
      "..",
      snap.imageUrl.replace(/^\//, "")
    );
    fs.unlink(absolutePath, () => {});

    await snap.deleteOne();
    res.json({ message: "Snapshot deleted" });
  } catch (err) {
    console.error("❌ Snapshot delete error:", err);
    res.status(500).json({ error: err.message });
  }
};
