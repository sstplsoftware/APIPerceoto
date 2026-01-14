// routes/demoSetup.js
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// 🧩 Storage setup for question uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/demo");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `demo_${unique}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// ===============================================
// ✅ POST /api/demo/setup
// ===============================================
router.post("/setup", upload.single("file"), async (req, res) => {
  try {
    const {
      adminName,
      adminEmail,
      adminPassword,
      candidates,
      subjects,
    } = JSON.parse(req.body.payload); // frontend sends JSON payload + file

    if (!adminName || !adminEmail || !adminPassword)
      return res.status(400).json({ error: "Admin info missing" });

    // 🔍 Prevent duplicate demo admin
    const exists = await User.findOne({ email: adminEmail });
    if (exists)
      return res.status(400).json({ error: "Demo admin already exists" });

    // 🔐 Hash password
    const hashed = await bcrypt.hash(adminPassword, 10);

    // 🕓 Expiry = 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 🧱 Create Demo Admin
    const demoAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashed,
      role: "demoadmin",
      expiresAt,
      verified: true,
      candidateLimit: 5,
    });

    // ✅ Create candidate accounts (max 5)
    const createdCandidates = [];
    if (Array.isArray(candidates) && candidates.length > 0) {
      for (const c of candidates.slice(0, 5)) {
        const hashedPass = await bcrypt.hash(c.password, 10);
        const candidate = await User.create({
          name: c.name,
          email: c.email,
          password: hashedPass,
          role: "candidate",
          candidateId: `${demoAdmin._id.toString().slice(-5)}-${Math.floor(
            Math.random() * 1000
          )}`,
          batchNumber: "DEMO-BATCH",
          verified: true,
          createdBy: demoAdmin._id,
        });
        createdCandidates.push(candidate);
      }
      demoAdmin.candidatesCreated = createdCandidates.length;
      await demoAdmin.save();
    }

    // ✅ Store uploaded file info
    const filePath = req.file ? `/uploads/demo/${req.file.filename}` : null;

    // ✅ Construct response data
    const summary = {
      admin: {
        name: demoAdmin.name,
        email: demoAdmin.email,
        expiresAt,
      },
      candidates: createdCandidates.map((c) => ({
        name: c.name,
        email: c.email,
      })),
      subjects: subjects || [],
      file: filePath,
    };

    res.status(201).json({
      message: "Demo setup completed successfully",
      summary,
    });
  } catch (err) {
    console.error("❌ Error in /api/demo/setup:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
