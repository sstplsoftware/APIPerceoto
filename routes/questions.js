// C:\6 nov !\canexam\backend\routes\questions.js
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const Question = require("../models/Question");
const { verifyToken, isAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ============================================================
   ✅ UPLOAD QUESTIONS (EXCEL)
============================================================ */
router.post(
  "/questions/upload",
  verifyToken,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      const { batchNumber } = req.body;

      if (!batchNumber)
        return res.status(400).json({ error: "Batch Number is required" });

      if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName)
        return res.status(400).json({ error: "Invalid Excel file" });

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (!rows.length)
        return res.status(400).json({ error: "Excel sheet empty" });

      const questions = rows.map((row) => ({
        sno: row["S.no"] || row["S No"] || row["Sno"],
        question: row["Question"],
        options: [
          row["Option 1"],
          row["Option 2"],
          row["Option 3"],
          row["Option 4"],
        ],
        correctAnswer: row["correct answer"] || row["Correct Answer"],
        batchNumber,
        createdBy: req.user.id,
      }));

      await Question.insertMany(questions);
      res.json({ message: `${questions.length} questions uploaded.` });
    } catch (err) {
      console.error("❌ Upload failed:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* ============================================================
   ✅ DISTINCT BATCHES
============================================================ */
router.get("/questions/batches", verifyToken, async (req, res) => {
  try {
    const questionQuery =
      req.user.role === "superadmin" ? {} : { createdBy: req.user.id };

    const questionBatches = await Question.distinct("batchNumber", questionQuery);

    const User = require("../models/User");
    const candidateQuery =
      req.user.role === "superadmin"
        ? { role: "candidate" }
        : { role: "candidate", createdBy: req.user.id };

    const candidateBatches = await User.distinct("batchNumber", candidateQuery);

    const allBatches = Array.from(
      new Set([...questionBatches, ...candidateBatches])
    );

    res.json(allBatches);
  } catch (err) {
    console.error("❌ Batch fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch batch list" });
  }
});

/* ============================================================
   ✅ GET QUESTIONS BY BATCH (Candidate Safe)
============================================================ */
router.get("/questions/batch/:batchNumber", verifyToken, async (req, res) => {
  try {
    const { batchNumber } = req.params;
    let query = { batchNumber };

    if (req.user.role !== "superadmin") {
      const ownerId =
        req.user.role === "candidate" ? req.user.createdBy : req.user.id;
      query.createdBy = ownerId;
    }

    const realQuestions = await Question.find({
      ...query,
      isPlaceholder: { $ne: true },
    });

    const placeholder = await Question.findOne({
      ...query,
      isPlaceholder: true,
    });

    const source = realQuestions[0] || placeholder;
    if (!source) return res.status(404).json({ error: "Batch not found" });

    const examInfo = {
      examDate: source.examDate || null,
      examTime: source.examTime || null,
      examDuration: source.examDuration || null,
    };

    const questions = realQuestions.map((q) => ({
      _id: q._id,
      sno: q.sno,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    res.json({ examInfo, questions });
  } catch (err) {
    console.error("❌ Fetch batch questions failed:", err);
    res.status(500).json({ error: "Failed to fetch batch questions" });
  }
});

/* ============================================================
   ✅ EXAM SCHEDULE CRUD
============================================================ */

// ✅ LIST EXAMS
router.get("/exam/list", verifyToken, isAdmin, async (req, res) => {
  try {
    const matchStage =
      req.user.role === "superadmin"
        ? {}
        : { createdBy: new mongoose.Types.ObjectId(req.user.id) };

    const list = await Question.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$batchNumber",
          examDate: { $first: "$examDate" },
          examTime: { $first: "$examTime" },
          duration: { $first: "$examDuration" },
          totalQuestions: {
            $sum: { $cond: [{ $eq: ["$isPlaceholder", true] }, 0, 1] },
          },
          hasPlaceholder: {
            $max: { $cond: [{ $eq: ["$isPlaceholder", true] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(list);
  } catch (err) {
    console.error("❌ Load exams failed:", err);
    res.status(500).json({ error: "Failed to load exams" });
  }
});

/* ============================================================
   ✅ CANDIDATE EXAM TIME CHECK
============================================================ */
router.get("/exam/check/:batchNumber", verifyToken, async (req, res) => {
  try {
    const { batchNumber } = req.params;

    const exam = await Question.findOne({ batchNumber });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const { examDate, examTime, examDuration } = exam;

    // 🔓 OPEN EXAM (no date & time)
    if (!examDate || !examTime) {
      return res.json({
        allowed: true,
        mode: "open",
      });
    }

    // ⏱ SCHEDULED EXAM
    const startTime = new Date(`${examDate} ${examTime}`).getTime();
    const endTime = startTime + examDuration * 60 * 1000;
    const now = Date.now();

    if (now < startTime) {
      return res.json({
        allowed: false,
        reason: "NOT_STARTED",
        startTime,
      });
    }

    if (now > endTime) {
      return res.json({
        allowed: false,
        reason: "EXPIRED",
      });
    }

    return res.json({
      allowed: true,
      mode: "scheduled",
      endTime,
    });
  } catch (err) {
    console.error("❌ Exam time check failed:", err);
    res.status(500).json({ error: "Failed to check exam time" });
  }
});


// ✅ CREATE SCHEDULE (DATE & TIME OPTIONAL, DURATION REQUIRED)
router.post("/exam/schedule", verifyToken, isAdmin, async (req, res) => {
  try {
    const { batchName, examDate, examTime, duration } = req.body;

    if (!batchName || !duration) {
      return res.status(400).json({
        error: "batchName and duration are required",
      });
    }

    const filter =
      req.user.role === "superadmin"
        ? { batchNumber: batchName }
        : { batchNumber: batchName, createdBy: req.user.id };

    const updateData = {
      examDuration: Number(duration),
    };

    if (examDate && examTime) {
      updateData.examDate = examDate;
      updateData.examTime = examTime;
    }

    const result = await Question.updateMany(filter, { $set: updateData });

    if (result.matchedCount === 0) {
      await Question.create({
        sno: 0,
        question: "__placeholder__",
        options: [],
        correctAnswer: "_",
        batchNumber: batchName,
        isPlaceholder: true,
        ...updateData,
        createdBy: req.user.id,
      });
    }

    res.json({ message: "Exam saved successfully" });
  } catch (err) {
    console.error("❌ Schedule exam failed:", err);
    res.status(500).json({ error: "Failed to schedule exam" });
  }
});

// ✅ UPDATE SCHEDULE
router.put("/exam/schedule/:batchName", verifyToken, isAdmin, async (req, res) => {
  try {
    const { batchName } = req.params;
    const { examDate, examTime, duration } = req.body;

    if (!duration) {
      return res.status(400).json({
        error: "duration is required",
      });
    }

    const filter =
      req.user.role === "superadmin"
        ? { batchNumber: batchName }
        : { batchNumber: batchName, createdBy: req.user.id };

    const updateData = {
      examDuration: Number(duration),
      examDate: examDate && examTime ? examDate : null,
      examTime: examDate && examTime ? examTime : null,
    };

    await Question.updateMany(filter, { $set: updateData });

    res.json({ message: "Exam updated successfully" });
  } catch (err) {
    console.error("❌ Update exam failed:", err);
    res.status(500).json({ error: "Failed to update exam" });
  }
});

// ✅ DELETE SCHEDULE (convert to OPEN exam)
router.delete("/exam/schedule/:batchName", verifyToken, isAdmin, async (req, res) => {
  try {
    const { batchName } = req.params;

    const filter =
      req.user.role === "superadmin"
        ? { batchNumber: batchName }
        : { batchNumber: batchName, createdBy: req.user.id };

    await Question.updateMany(filter, {
      $unset: { examDate: "", examTime: "" },
    });

    await Question.deleteMany({ ...filter, isPlaceholder: true });

    res.json({ message: "Exam schedule removed (open exam)" });
  } catch (err) {
    console.error("❌ Delete exam schedule failed:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
});

/* ============================================================
   ✅ QUESTION CRUD
============================================================ */

router.put("/questions/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { sno, question, options, correctAnswer } = req.body;

    if (!question || !Array.isArray(options) || options.length < 2)
      return res.status(400).json({
        error: "Question and at least two options are required",
      });

    if (!options.includes(correctAnswer))
      return res.status(400).json({
        error: "Correct answer must match one of the options",
      });

    await Question.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { sno, question, options, correctAnswer }
    );

    res.json({ message: "Updated" });
  } catch (err) {
    console.error("❌ Question update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/questions/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    await Question.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Question delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
