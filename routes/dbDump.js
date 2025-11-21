const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");

// MODELS (ONLY those visible in your screenshot)
const User = require("../models/User");
const Course = require("../models/CourseModel");
const Subject = require("../models/SubjectModel");
const Question = require("../models/Question");
const QuestionBank = require("../models/QuestionBank");
const Result = require("../models/Result");
const ResultAPIModel = require("../models/ResultAPIModel");
const ResultD = require("../models/ResultD");
const Snapshot = require("../models/Snapshot");
const DemoCandidate = require("../models/DemoCandidate.model");
const DemoExamCandidate = require("../models/demoExamCandidate.model");
const DemoExamQuestion = require("../models/demoExamQuestion.model");
const DemoExamResult = require("../models/demoExamResult.model");
const DemoRequest = require("../models/DemoRequest");
const Candidate = require("../models/Candidate");
const ExamSession = require("../models/ExamSession");
const FeedbackUser = require("../models/FeedbackUserModel");
const Admin = require("../models/Admin");

// SUPERADMIN CHECK
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

// ========================================
// 🔥 FULL DATABASE DUMP FOR SUPERADMIN
// ========================================
router.get("/db-dump", verifyToken, requireSuper, async (req, res) => {
  try {
    const data = {
      users: await User.find().lean(),
      admins: await Admin.find().lean(),
      candidates: await Candidate.find().lean(),
      demoCandidates: await DemoCandidate.find().lean(),

      courses: await Course.find().lean(),
      subjects: await Subject.find().lean(),

      questions: await Question.find().lean(),
      questionBank: await QuestionBank.find().lean(),
      demoExamQuestions: await DemoExamQuestion.find().lean(),

      results: await Result.find().lean(),
      resultAPI: await ResultAPIModel.find().lean(),
      resultD: await ResultD.find().lean(),
      demoExamResults: await DemoExamResult.find().lean(),

      snapshots: await Snapshot.find().lean(),
      demoRequests: await DemoRequest.find().lean(),
      examSessions: await ExamSession.find().lean(),
      feedbackUsers: await FeedbackUser.find().lean(),
    };

    res.json(data);
  } catch (err) {
    console.error("DB DUMP ERROR:", err);
    res.status(500).json({ error: "Failed to load DB dump" });
  }
});

module.exports = router;
