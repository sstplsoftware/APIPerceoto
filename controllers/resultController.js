// controllers/resultController.js
const Result = require("../models/Result");
const Snapshot = require("../models/Snapshot");

// ✅ Candidate-specific results
const getCandidateResults = async (req, res) => {
  try {
    const results = await Result.find({
      candidateId: req.user.candidateId,
      batchNumber: req.user.batchNumber,
    })
      .select("candidateId name email score total batchNumber createdAt")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching candidate results:", err);
    res.status(500).json({ error: "Failed to fetch candidate results" });
  }
};

// ✅ Admin-specific results (isolated)
const getAllResults = async (req, res) => {
  try {
    // 🔹 Fetch results created by this admin
    const results = await Result.find({ createdBy: req.user.id });

    // 🔹 Fetch snapshots belonging to same admin
    const allSnapshots = await Snapshot.find({ createdBy: req.user.id });

    // 🔹 Attach snapshots to their matching result
    const resultsWithSnapshots = results.map((r) => {
      const userSnaps = allSnapshots.filter(
        (s) => s.email === r.email && s.batchNumber === r.batchNumber
      );

      return {
        ...r.toObject(),
        snapshots: userSnaps,
      };
    });

    res.json(resultsWithSnapshots);
  } catch (err) {
    console.error("❌ Error fetching all results:", err);
    res.status(500).json({ error: "Failed to fetch all results" });
  }
};

module.exports = {
  getCandidateResults,
  getAllResults,
};
