// C:\6 nov !\canexam\backend\routes\submit.js
const express = require("express");
const Question = require("../models/Question");
const Result = require("../models/Result");
const { verifyToken, isAdmin } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const XLSX = require("xlsx");

const router = express.Router();

/* ============================================================
   ✅ SUBMIT TEST (Candidate)
============================================================ */
/* ============================================================
   ✅ SUBMIT TEST (Candidate)
============================================================ */
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const { answers } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "candidate") {
      return res.status(403).json({ error: "Only candidates can submit tests" });
    }

    const createdBy = user.createdBy;

    // ✅ Exclude placeholder or empty questions
    const questions = await Question.find({
  batchNumber: user.batchNumber,
  createdBy,
  isPlaceholder: { $ne: true }, // ✅ skip dummy question
});

    if (!questions.length) {
      return res.status(404).json({ error: "No valid questions found for this batch" });
    }

    // ✅ Normalize answers (object or array)
    const normalizedAnswers = Array.isArray(answers)
      ? answers.filter((a) => a.questionId && a.selectedOption)
      : Object.entries(answers)
          .filter(([id, val]) => id && id !== "undefined" && val)
          .map(([questionId, selectedOption]) => ({ questionId, selectedOption }));

    let score = 0;
    const evaluatedAnswers = [];

    normalizedAnswers.forEach((ans) => {
      const q = questions.find((qq) => qq._id.toString() === ans.questionId);
      if (q) {
        if (q.correctAnswer === ans.selectedOption) score++;
        evaluatedAnswers.push({
          questionId: ans.questionId,
          selectedOption: ans.selectedOption,
        });
      }
    });

    // ✅ Accurate total — only real (non-placeholder) questions
    const total = questions.length;

    const result = new Result({
      candidateId: user.candidateId,
      name: user.name,
      email: user.email,
      score,
      total,
      answers: evaluatedAnswers,
      batchNumber: user.batchNumber,
      createdBy,
    });

    await result.save();

    res.json({
      message: "✅ Test submitted successfully",
      score,
      total,
    });
  } catch (err) {
    console.error("❌ Submit Error:", err);
    res.status(500).json({ error: "Failed to submit test" });
  }
});


/* ============================================================
   ✅ FETCH RESULTS (Admin Scoped)
============================================================ */
router.get("/results", verifyToken, isAdmin, async (req, res) => {
  try {
    const query =
      req.user.role === "superadmin"
        ? {}
        : { createdBy: req.user.id };

    const results = await Result.find(query).sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    console.error("❌ Fetch results error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

/* ============================================================
   ✅ DOWNLOAD RESULTS AS EXCEL (Admin Scoped)
============================================================ */
router.get("/results/download", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token)
      return res.status(401).json({ error: "Access Denied. No Token Provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || (user.role !== "admin" && user.role !== "superadmin"))
      return res.status(403).json({ error: "Forbidden" });

    const query =
      user.role === "superadmin"
        ? {}
        : { createdBy: user._id };

    const results = await Result.find(query);

    if (!results.length)
      return res.status(404).json({ error: "No results found to export" });

    const data = results.map((r, index) => ({
      SNo: index + 1,
      ID: r.candidateId || "N/A",
      Name: r.name || "N/A",
      Email: r.email || "N/A",
      Score: `${r.score} / ${r.total || "N/A"}`,
      Batch: r.batchNumber || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="results.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error("❌ Excel Download Error:", err);
    res.status(500).json({ error: "Failed to export results" });
  }
});

module.exports = router;
