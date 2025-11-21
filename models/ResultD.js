// models/ResultD.js
const mongoose = require("mongoose");

const ResultDSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, default: 0 },
}, { timestamps: true });

// 👇 use a unique model name
module.exports = mongoose.model("ResultD", ResultDSchema);
