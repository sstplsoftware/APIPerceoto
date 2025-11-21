// C:\6 nov !\canexam\backend\models\Question.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    sno: Number,
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true },
    batchNumber: { type: String, required: true },

    // ✅ Exam scheduling fields (added)
    examDate: { type: String },       // e.g. "2025-11-10"
    examTime: { type: String },       // e.g. "10:00"
    examDuration: { type: Number },   // minutes

    // ✅ Placeholder doc support so we can “create” a batch without questions
    isPlaceholder: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", QuestionSchema);
