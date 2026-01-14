const mongoose = require("mongoose");

const DemoCandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    phone: { type: String },

    city: { type: String },

    // which subject this candidate will take
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },

    // cached for fast login response (no extra populate on every login)
    subjectName: { type: String, default: "" },

    // exam duration (minutes) controlled by demo admin per subject
    timeLimitMinutes: { type: Number, default: 60 },

    batchNumber: { type: String, default: "" },

    candidateId: { type: String, default: "" },

    role: {
      type: String,
      enum: ["democandidate"],
      default: "democandidate",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // demo admin
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoCandidate ||
  mongoose.model("DemoCandidate", DemoCandidateSchema);
