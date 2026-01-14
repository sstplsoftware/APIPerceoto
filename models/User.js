// models/User.js
const mongoose = require("mongoose");

const ROLES = ["superadmin", "admin", "demoadmin", "candidate"];

const userSchema = new mongoose.Schema(
  {
    // ---------- Basic Info ----------
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true },

    // ---------- Role Control ----------
    role: {
      type: String,
      enum: ROLES,
      default: "candidate",
      required: true,
      index: true,
    },

    // ---------- Candidate-only Fields ----------
    candidateId: {
      type: String,
      required: function () {
        return this.role === "candidate";
      },
    },

    batchNumber: {
      type: String,
      required: function () {
        return this.role === "candidate";
      },
    },

    // ---------- Optional Exam Info ----------
    examDate: String,
    examTime: String,
    examDuration: Number,

    // ---------- Verification & Status ----------
    verified: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["active", "suspended", "expired"],
      default: "active",
    },

    // ---------- Demo Admin (optional) ----------
    expiresAt: { type: Date },

    // (Removed limits — no candidate or subject cap)
    candidateLimit: { type: Number, default: 0 },
    candidatesCreated: { type: Number, default: 0 },

    // ---------- Meta Tracking ----------
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// 🔹 Enforce candidateId + batchNumber uniqueness
userSchema.index(
  { candidateId: 1, batchNumber: 1 },
  { unique: true, partialFilterExpression: { role: "candidate" } }
);

// 🔹 TTL for Demo Admins (optional)
userSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { role: "demoadmin" },
  }
);

// ---------- Helper Virtuals ----------
userSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
});

userSchema.virtual("daysLeft").get(function () {
  if (!this.expiresAt) return null;
  const diffMs = this.expiresAt.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
