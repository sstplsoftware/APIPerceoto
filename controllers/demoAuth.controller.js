// controllers/demoAuth.controller.js
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

// ✅ Simple DemoRequest schema inline (or in /models/DemoRequest.js)
const DemoRequestSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    reason: String,
    passwordHash: String,
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const DemoRequest =
  mongoose.models.DemoRequest || mongoose.model("DemoRequest", DemoRequestSchema);

// ===========================================================
// 1️⃣ Request Demo Access (includes password directly)
// ===========================================================
exports.requestAccessPlain = async (req, res) => {
  try {
    const { name, email, phone, reason, password } = req.body;

    if (!name || !email || !phone || !reason || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check existing user or pending request
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ error: "Email already registered in system" });

    const existingReq = await DemoRequest.findOne({
      email,
      status: "pending",
    });
    if (existingReq)
      return res
        .status(400)
        .json({ error: "A request with this email is already pending" });

    // Hash password and store request
    const passwordHash = await bcrypt.hash(password, 10);

    const demoReq = await DemoRequest.create({
      name,
      email,
      phone,
      reason,
      passwordHash,
    });

    return res.json({
      message: "Demo access request submitted successfully",
      requestId: demoReq._id,
    });
  } catch (err) {
    console.error("Request Access error:", err);
    return res
      .status(500)
      .json({ error: "Server error while submitting request" });
  }
};

// ===========================================================
// 2️⃣ Get All Demo Requests (Super Admin view)
// ===========================================================
exports.getAllDemoRequests = async (_req, res) => {
  try {
    const list = await DemoRequest.find().sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("getAllDemoRequests error:", err);
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
};

// ===========================================================
// 3️⃣ Activate Demo Request → Creates Demo Admin User
// ===========================================================
exports.activateDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const demoReq = await DemoRequest.findById(id);

    if (!demoReq)
      return res.status(404).json({ error: "Request not found" });

    if (demoReq.status === "active")
      return res
        .status(400)
        .json({ error: "This request is already active" });

    // Create demo admin user
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const demoAdmin = await User.create({
      name: demoReq.name,
      email: demoReq.email,
      password: demoReq.passwordHash,
      role: "demoadmin",
      verified: true,
      candidateLimit: 5,
      expiresAt,
    });

    // Mark as active
    demoReq.status = "active";
    await demoReq.save();

    return res.json({
      message: "Demo Admin account activated successfully",
      demoAdmin: {
        id: demoAdmin._id,
        name: demoAdmin.name,
        email: demoAdmin.email,
        expiresAt: demoAdmin.expiresAt,
      },
    });
  } catch (err) {
    console.error("Activate Demo error:", err);
    return res.status(500).json({ error: "Failed to activate request" });
  }
};

// ===========================================================
// 4️⃣ Delete Demo Request (Reject)
// ===========================================================
exports.deleteDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DemoRequest.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ error: "Request not found" });

    return res.json({ message: "Demo request deleted successfully" });
  } catch (err) {
    console.error("Delete Demo Request error:", err);
    return res.status(500).json({ error: "Failed to delete request" });
  }
};
