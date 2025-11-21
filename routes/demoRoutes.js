// routes/demoRoutes.js
const express = require("express");
const router = express.Router();

/**
 * POST /api/demo/request
 * This is hit by DemoVerify.jsx after Google login.
 * For now we just acknowledge and return success so frontend doesn't 404.
 * Later you can verify Google token and create demoadmin temp row here.
 */
router.post("/request", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Google credential" });
    }

    // TODO (later):
    // - verify credential with Google
    // - create demo admin or mark as pending
    // - send OTP / email link etc.

    return res.json({
      success: true,
      message: "Demo request received",
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/demo/request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", details: err.message });
  }
});

module.exports = router;
