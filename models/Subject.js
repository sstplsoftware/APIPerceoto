// models/Subject.js
const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String },

    // ✅ Each subject belongs to an Admin or DemoAdmin
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // 🔹 Removed candidate limit
    candidateLimitPerSubject: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", SubjectSchema);
