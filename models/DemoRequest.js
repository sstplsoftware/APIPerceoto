// models/DemoRequest.js
const mongoose = require("mongoose");

const DemoRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    reason: { type: String, required: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ["pending", "active"], default: "pending" },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoRequest ||
  mongoose.model("DemoRequest", DemoRequestSchema);
