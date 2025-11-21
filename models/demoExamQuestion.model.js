const mongoose = require("mongoose");

const DemoExamQuestionSchema = new mongoose.Schema(
  {
    subject: {
      // store Subject _id as string for simplicity
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ],
    correctAnswer: {
      // we keep it string to support either "4" or "Delhi"
      type: String,
      required: true,
    },
    // per-question allowed time (seconds or minutes, you decide in UI)
    timeLimit: {
      type: Number,
      default: 60,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoExamQuestion ||
  mongoose.model("DemoExamQuestion", DemoExamQuestionSchema);
