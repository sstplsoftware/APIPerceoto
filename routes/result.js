const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Snapshot = require("../models/Snapshot");
const Result = require("../models/Result");
const Question = require("../models/Question");
const User = require("../models/User");

const { verifyToken, isAdmin } = require("../middleware/auth");
const { getAllResults, getCandidateResults } = require("../controllers/resultController");

/* ============================================================
   ⭐ PUBLIC VERIFY USING candidateId (NO TOKEN REQUIRED)
   ⚠️ MUST BE ON TOP BEFORE ANY /:id ROUTE
============================================================ */
router.get("/results/verify/:candidateId", async (req, res) => {
  try {
    const result = await Result.findOne({
      candidateId: req.params.candidateId,
    });

    if (!result)
      return res.status(404).json({ error: "Result not found" });

    res.json({ result });
  } catch (err) {
    console.error("PUBLIC VERIFY ERROR:", err);
    res.status(500).json({ error: "Server error during public verify" });
  }
});



/* ============================================================
   ✅ SUBMIT TEST (Candidate Only)
============================================================ */
router.post("/submit-test", verifyToken, async (req, res) => {
  try {
    const { answers, name, email, batchNumber } = req.body;

    const candidate = await User.findOne({ email, batchNumber, role: "candidate" });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found in this batch" });
    }

    const createdBy = candidate.createdBy;

    // Fetch questions (skip blank)
    let questions = await Question.find({
      batchNumber,
      createdBy,
      question: { $ne: "" }
    });

    questions = questions.filter(q => q && q.question && q.correctAnswer);

    if (!questions.length) {
      return res.status(404).json({ error: "No valid questions found" });
    }

    let score = 0;
    const evaluatedAnswers = [];

    questions.forEach((q) => {
      const userAnswer = answers[q._id];
      if (userAnswer && userAnswer === q.correctAnswer) score++;
      evaluatedAnswers.push({ questionId: q._id, selectedOption: userAnswer });
    });

    const result = new Result({
      candidateId: candidate.candidateId,
      name,
      email,
      score,
      total: questions.length,
      answers: evaluatedAnswers,
      batchNumber,
      createdBy,
    });

    await result.save();
    res.json({ message: "✅ Test submitted successfully", result });
  } catch (err) {
    console.error("❌ Submit test error:", err);
    res.status(500).json({ error: "Failed to submit test" });
  }
});

/* ============================================================
   ✅ CANDIDATE RESULT FETCH (Candidate View)
============================================================ */
router.get("/results", verifyToken, getCandidateResults);

/* ============================================================
   ✅ ADMIN RESULT FETCH (Admin Scoped)
============================================================ */
router.get("/results/admin", verifyToken, isAdmin, getAllResults);

/* ============================================================
   ⭐ ADMIN SINGLE RESULT FETCH (PRIVATE by _id + ownership)
============================================================ */
router.get("/results/admin/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!result)
      return res.status(404).json({ error: "Result not found or not owned by you" });

    res.json({ result });
  } catch (err) {
    console.error("ADMIN RESULT LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load result" });
  }
});

/* ============================================================
   ⭐ UPDATE RESULT (Admin Only)
============================================================ */
router.put("/results/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { score, total } = req.body;

    const updated = await Result.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { score, total },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Result not found or not yours" });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE RESULT ERROR:", err);
    res.status(500).json({ error: "Failed to update result" });
  }
});

/* ============================================================
   ⭐ DELETE RESULT (Admin Only)
============================================================ */
router.delete("/results/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const deleted = await Result.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!deleted)
      return res.status(404).json({ error: "Result not found or not yours" });

    res.json({ message: "Result deleted successfully" });
  } catch (err) {
    console.error("DELETE RESULT ERROR:", err);
    res.status(500).json({ error: "Failed to delete result" });
  }
});

/* ============================================================
   ⭐ SNAPSHOT FETCH (Admin Only)
============================================================ */
router.get("/snapshots", verifyToken, isAdmin, async (req, res) => {
  try {
    const snapshots = await Snapshot.find({ createdBy: req.user.id }).sort({
      timestamp: -1,
    });
    res.json(snapshots);
  } catch (err) {
    console.error("SNAPSHOT ERROR:", err);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

/* ============================================================
   ⭐ ADMIN DETAILED RESULT (FULL INFO FOR PDF)
============================================================ */
router.get("/results/admin/:id/detail", verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!result)
      return res.status(404).json({ error: "Result not found or not owned by you" });

    // Load all questions for this batch created by same admin
    const questions = await Question.find({
      batchNumber: result.batchNumber,
      createdBy: req.user.id,
    });

    // Convert to map for fast lookup
    const qMap = {};
    questions.forEach(q => {
      qMap[q._id] = q;
    });

    // Merge answers with question details
    const detailedAnswers = result.answers.map(a => {
      const q = qMap[a.questionId] || {};
      return {
        questionId: a.questionId,
        questionText: q.question || "N/A",
        options: q.options || [],
        selectedOption: a.selectedOption,
        correctOption: q.correctAnswer || "N/A",
        isCorrect: a.selectedOption === q.correctAnswer
      };
    });

    res.json({
      ...result.toObject(),
      answers: detailedAnswers,
    });

  } catch (err) {
    console.error("ADMIN DETAIL ERROR:", err);
    res.status(500).json({ error: "Failed to load detailed result" });
  }
});

// ==========================================================
// ⭐ ADMIN — GET FULL RESULT WITH QUESTIONS + CORRECT ANSWERS
// ==========================================================
router.get("/results/admin/:id/detail", verifyToken, isAdmin, async (req, res) => {
  try {
    // Fetch result
    const result = await Result.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!result)
      return res.status(404).json({ error: "Result not found" });

    // Fetch all questions for matching batch+creator
    const questions = await Question.find({
      batchNumber: result.batchNumber,
      createdBy: result.createdBy,
      isPlaceholder: { $ne: true }
    });

    // Merge question data into answers[]
    const mergedAnswers = result.answers.map((ans) => {
      const q = questions.find((qq) => qq._id.toString() === ans.questionId);

      return {
        questionId: ans.questionId,
        questionText: q?.question || "N/A",
        selectedOption: ans.selectedOption || "—",
        correctOption: q?.correctAnswer || "—",
        isCorrect: ans.selectedOption === q?.correctAnswer,
      };
    });

    res.json({
      ...result.toObject(),
      answers: mergedAnswers,
    });

  } catch (err) {
    console.error("DETAIL RESULT ERROR:", err);
    res.status(500).json({ error: "Failed to load detailed result" });
  }
});

// DELETE /api/results/admin/:id
router.delete("/admin/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Result.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete result error:", err);
    return res.status(500).json({ error: "Failed to delete result" });
  }
});

module.exports = router;
