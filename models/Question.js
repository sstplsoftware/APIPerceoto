const mongoose = require("mongoose");
const QuestionSchema = new mongoose.Schema(
  {
    sno: Number,
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true },
    batchNumber: { type: String, required: true },

    // ✅ NEW — FEEDBACK METADATA (SAFE ADDITION)
    skillCategory: { type: String, default: "General" },
    subSkill: { type: String },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    mappedRoles: { type: [String], default: [] },
    weightage: { type: Number, default: 1 },

    // ✅ Exam scheduling (already there)
    examDate: String,
    examTime: String,
    examDuration: Number,

    isPlaceholder: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Question", QuestionSchema);
