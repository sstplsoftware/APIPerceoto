const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    // User Details
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },

    // Course & Subject
    courseId: { type: String, required: true },
    subjectId: { type: String, required: true },

    // NEW FIELDS (Needed for PDF + UI)
    courseTitle: { type: String, default: "Unknown Course" },
    subjectName: { type: String, default: "Unknown Subject" },

    // Summary
    totalQuestions: Number,
    attempted: Number,
    correct: Number,
    percentage: Number,
    timeTaken: String,

    // Detailed Question Analysis
    analysis: [
      {
        questionId: String,
        questionText: String,
        options: [String],
        correctAnswerIndex: Number,
        selectedAnswerIndex: Number,
        isCorrect: Boolean,
        wasFlagged: Boolean,
      },
    ],
  },
  { timestamps: true }
);

// Prevent Overwrite Error During Hot Reload
module.exports =
  mongoose.models.AssessmentResult ||
  mongoose.model("AssessmentResult", ResultSchema);
