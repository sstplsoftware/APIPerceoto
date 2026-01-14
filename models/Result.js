const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  candidateId: { type: String, required: true },
  name: String,
  email: { type: String, required: true },
  score: Number,
  total: Number,
  answers: [{ questionId: String, selectedOption: String }],
  batchNumber: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model('Result', resultSchema);
