const mongoose = require("mongoose");

const feedbackUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: { type: String, required: true },

    password: { type: String, required: true },

    isVerified: { type: Boolean, default: false },

    // Optional but useful fields for future:
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeedbackUser", feedbackUserSchema);
