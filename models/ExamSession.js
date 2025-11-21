const mongoose = require("mongoose");
const ExamSessionSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startedAt: { type: Date },
  endedAt: { type: Date },
  status: { type: String, enum: ["scheduled", "running", "completed"], default: "scheduled" },
  warnings: [{ ts: Date, type: String, meta: Object }],
  lastScreenshotPath: String,
}, { timestamps: true });

module.exports = mongoose.model("ExamSession", ExamSessionSchema);
