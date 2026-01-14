const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");

// ===============================
// MODELS (SAFE IMPORTS)
// ===============================
const User = require("../models/User");

let Course, Subject, Question, QuestionBank;
let Result, ResultAPIModel, ResultD;
let Snapshot, DemoCandidate, DemoExamQuestion, DemoExamResult;
let DemoRequest, ExamSession, FeedbackUser;

try {
  Course = require("../models/CourseModel");
  Subject = require("../models/SubjectModel");
  Question = require("../models/Question");
  QuestionBank = require("../models/QuestionBank");
  Result = require("../models/Result");
  ResultAPIModel = require("../models/ResultAPIModel");
  ResultD = require("../models/ResultD");
  Snapshot = require("../models/Snapshot");
  DemoCandidate = require("../models/DemoCandidate.model");
  DemoExamQuestion = require("../models/demoExamQuestion.model");
  DemoExamResult = require("../models/demoExamResult.model");
  DemoRequest = require("../models/DemoRequest");
  ExamSession = require("../models/ExamSession");
  FeedbackUser = require("../models/FeedbackUserModel");
} catch (err) {
  console.warn("⚠️ Some optional DB models not loaded:", err.message);
}

// ===============================
// SUPER ADMIN GUARD
// ===============================
const requireSuper = async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u || u.role !== "superadmin") {
      return res.status(403).json({ error: "Super Admin only access" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===============================
// 🔥 FULL DATABASE DUMP (READ ONLY)
// ===============================
router.get("/db-dump", verifyToken, requireSuper, async (req, res) => {
  try {
    const data = {
      // 👤 USERS (single source of truth)
      users: await User.find()
        .select("-password -__v")
        .lean(),

      admins: await User.find({ role: "admin" })
        .select("-password -__v")
        .lean(),

      candidates: await User.find({ role: "candidate" })
        .select("-password -__v")
        .lean(),

      demoCandidates: await User.find({ role: "demoadmin" })
        .select("-password -__v")
        .lean(),

      // 📚 ACADEMICS
      courses: Course ? await Course.find().lean() : [],
      subjects: Subject ? await Subject.find().lean() : [],

      questions: Question ? await Question.find().lean() : [],
      questionBank: QuestionBank ? await QuestionBank.find().lean() : [],
      demoExamQuestions: DemoExamQuestion
        ? await DemoExamQuestion.find().lean()
        : [],

      // 📊 RESULTS
      results: Result ? await Result.find().lean() : [],
      resultAPI: ResultAPIModel ? await ResultAPIModel.find().lean() : [],
      resultD: ResultD ? await ResultD.find().lean() : [],
      demoExamResults: DemoExamResult
        ? await DemoExamResult.find().lean()
        : [],

      // 🛰 MONITORING & META
      snapshots: Snapshot ? await Snapshot.find().lean() : [],
      demoRequests: DemoRequest ? await DemoRequest.find().lean() : [],
      examSessions: ExamSession ? await ExamSession.find().lean() : [],
      feedbackUsers: FeedbackUser ? await FeedbackUser.find().lean() : [],
    };

    res.json(data);
  } catch (err) {
    console.error("❌ DB DUMP ERROR:", err);
    res.status(500).json({ error: "Failed to load DB dump" });
  }
});

module.exports = router;
