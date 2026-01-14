// models/VerifyToken.js
const mongoose = require("mongoose");

const verifyTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    token: { type: String, required: true },
    purpose: { type: String, default: "demo-verify" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerifyToken", verifyTokenSchema);
