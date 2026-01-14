const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectModel",
      required: true,
    },
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswerIndex: { type: Number, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionModel", questionSchema);
