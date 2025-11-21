const mongoose = require("mongoose");

const DemoSnapshotSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemoCandidate",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectName: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    takenAt: { type: Date, default: Date.now },

    meta: {
      tabWarnings: { type: Number, default: 0 },
      strikeCount: { type: Number, default: 0 },
    },

    // ✅ NEW FIELD: link each snapshot to its demo admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "DemoAdmin" depending on your schema name
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.DemoSnapshot ||
  mongoose.model("DemoSnapshot", DemoSnapshotSchema);
