const mongoose = require("mongoose");

const DemoExamResultSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemoCandidate", // ✅ corrected reference name for consistency
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DemoExamQuestion",
        },
        selectedOption: String,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    // ✅ NEW FIELD: link each result to the demo admin who owns the candidate
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "DemoAdmin" if you have a separate model
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoExamResult ||
  mongoose.model("DemoExamResult", DemoExamResultSchema);
