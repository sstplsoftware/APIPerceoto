const mongoose = require("mongoose");

const feedbackUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false }, // ✅ new field
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeedbackUser", feedbackUserSchema);
