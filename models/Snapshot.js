const mongoose = require("mongoose");

const snapshotSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  name: String,
  batchNumber: String,
  imageUrl: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Snapshot = mongoose.model("Snapshot", snapshotSchema);

module.exports = Snapshot;
