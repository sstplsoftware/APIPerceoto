const mongoose = require("mongoose");

const DemoExamCandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    city: { type: String },
    subject: { type: String },
    batchNumber: { type: String, default: null },
    candidateId: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoExamCandidate ||
  mongoose.model("DemoExamCandidate", DemoExamCandidateSchema);
