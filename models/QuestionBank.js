const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // demo admin
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionBank", questionBankSchema);
