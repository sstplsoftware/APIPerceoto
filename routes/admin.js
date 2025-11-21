// routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");

/* =========================================================
   ✅ ROUTE 1: Get Admins
   - Superadmin: all admins
   - Admin: only self
========================================================= */
router.get(
  "/admins",
  verifyToken,
  requireRole("superadmin", "admin"),
  async (req, res) => {
    try {
      if (req.user.role === "admin") {
        const me = await User.findById(req.user.id).select("name email role createdAt");
        return res.json(me ? [me] : []);
      }

      const admins = await User.find({ role: "admin" })
        .select("name email role createdAt")
        .sort({ createdAt: -1 });

      return res.json(admins);
    } catch (err) {
      console.error("❌ Error fetching admins:", err);
      return res.status(500).json({ error: "Failed to fetch admin users" });
    }
  }
);

/* =========================================================
   ✅ ROUTE 2: Get All Users Segmented by Role
   - Superadmin: all users
   - Admin/DemoAdmin: only own created users
========================================================= */
router.get(
  "/users/segmented",
  verifyToken,
  requireRole("superadmin", "admin", "demoadmin"),
  async (req, res) => {
    try {
      const isSuperAdmin = req.user.role === "superadmin";
      const baseFilter = isSuperAdmin ? {} : { createdBy: req.user.id };

      // 🔹 Fetch different roles with isolation
      const superAdmins = isSuperAdmin
        ? await User.find({ role: "superadmin" })
            .select("name email role createdAt verified status")
            .sort({ createdAt: -1 })
        : [];

      const admins = isSuperAdmin
        ? await User.find({ role: "admin" })
            .select("name email role createdAt verified status")
            .sort({ createdAt: -1 })
        : [];

      const demoAdmins = await User.find({
        role: "demoadmin",
        ...baseFilter,
      })
        .select(
          "name email role createdAt expiresAt candidateLimit candidatesCreated verified status"
        )
        .sort({ createdAt: -1 });

      const candidates = await User.find({
        role: "candidate",
        ...baseFilter,
      })
        .select("name email role batchNumber candidateId verified status createdAt")
        .sort({ createdAt: -1 });

      // 🔹 Separate demo vs regular candidates by batchNumber
      const demoCandidates = candidates.filter(
        (c) => c.batchNumber && c.batchNumber.toUpperCase() === "DEMO"
      );
      const regularCandidates = candidates.filter(
        (c) => !c.batchNumber || c.batchNumber.toUpperCase() !== "DEMO"
      );

      // 🔹 Build final response object
      const segmented = {
        superAdmins,
        admins,
        demoAdmins,
        demoCandidates,
        candidates: regularCandidates,
      };

      res.json(segmented);
    } catch (err) {
      console.error("❌ Error fetching segmented users:", err);
      res.status(500).json({ error: "Failed to fetch segmented users" });
    }
  }
);

module.exports = router;
