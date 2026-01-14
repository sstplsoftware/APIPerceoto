// C:\canexam\backend\controllers\demoAdmin.controller.js

const bcrypt = require("bcryptjs");
const xlsx = require("xlsx");

const User = require("../models/User");
const Subject = require("../models/Subject");
const QuestionBank = require("../models/QuestionBank"); // legacy, for cleanup
const ResultD = require("../models/ResultD");
const DemoCandidate = require("../models/DemoCandidate.model");
const DemoExamQuestion = require("../models/demoExamQuestion.model");

// -----------------------------------------------------
// Helper: only Demo Admin can access these routes
// -----------------------------------------------------
const ensureDemoAdmin = async (req) => {
  const user = await User.findById(req.user?.id).lean();
  if (!user || user.role !== "demoadmin") {
    const err = new Error("Access denied: Demo Admin only");
    err.status = 403;
    throw err;
  }
  return user;
};

// =========================================
// ✅ DEMO ADMIN INFO
// =========================================
exports.getDemoAdminInfo = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    const totalSubjects = await Subject.countDocuments({ owner: me._id });
    const totalCandidates = await DemoCandidate.countDocuments({
      createdBy: me._id,
    });

    res.json({
      name: me.name,
      email: me.email,
      expiresAt: me.expiresAt,
      totalSubjects,
      totalCandidates,
      remainingSubjects: 2 - totalSubjects,
      remainingCandidates: 5 - totalCandidates,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

// =========================================
// ✅ SUBJECTS CRUD
// =========================================
exports.listSubjects = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    const docs = await Subject.find({ owner: me._id })
      .sort({ createdAt: -1 })
      .lean();

    // Shape response for frontend timer table in QuestionUploader
    const shaped = docs.map((s) => ({
      _id: s._id,
      name: s.name,
      code: s.code || "",
      createdAt: s.createdAt,
      timeLimitMinutes: s.timeLimitMinutes || 60,
    }));

    res.json(shaped);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    // enforce demo limit
    const count = await Subject.countDocuments({ owner: me._id });
    if (count >= 2) {
      return res.status(400).json({ error: "Demo limit: 2 subjects" });
    }

    const { name, code, timeLimitMinutes } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const doc = await Subject.create({
      name,
      code,
      owner: me._id,
      timeLimitMinutes: timeLimitMinutes || 60,
    });

    res.status(201).json({
      _id: doc._id,
      name: doc.name,
      code: doc.code || "",
      timeLimitMinutes: doc.timeLimitMinutes || 60,
      createdAt: doc.createdAt,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    const sub = await Subject.findOne({
      _id: req.params.id,
      owner: me._id,
    });
    if (!sub) {
      return res.status(404).json({ error: "Subject not found" });
    }

    // cleanup old + new question sources + results tied to this subject
    await QuestionBank.deleteMany({ subject: sub._id });
    await DemoExamQuestion.deleteMany({ subject: String(sub._id) });
    await ResultD.deleteMany({ subject: sub._id });

    await sub.deleteOne();

    res.json({ message: "Subject deleted" });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

// =========================================
// ✅ Subject Timer Update
// =========================================
exports.updateSubjectTimer = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    const { id } = req.params;
    const rawDuration = req.body.duration;

    const duration = Number(rawDuration);
    if (!duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: "Invalid timer value" });
    }

    const sub = await Subject.findOne({ _id: id, owner: me._id });
    if (!sub) {
      return res.status(404).json({ error: "Subject not found" });
    }

    sub.timeLimitMinutes = duration;
    await sub.save();

    res.json({
      message: "Timer updated",
      subjectId: sub._id,
      timeLimitMinutes: sub.timeLimitMinutes,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

// =========================================
// ✅ CANDIDATES CRUD
// =========================================
exports.listCandidates = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    const users = await DemoCandidate.find({ createdBy: me._id })
      .select("-password")
      .lean();

    res.json(
      users.map((c) => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        candidateId: c.candidateId,
        subjectId: c.subjectId,
        subjectName: c.subjectName || "",
        timeLimitMinutes: c.timeLimitMinutes || 60,
      }))
    );
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

exports.addCandidate = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    // enforce demo limit
    const count = await DemoCandidate.countDocuments({ createdBy: me._id });
    if (count >= 5) {
      return res.status(400).json({ error: "Demo limit: 5 candidates" });
    }

    const { name, email, password, subjectId } = req.body;
    if (!name || !email || !password || !subjectId) {
      return res.status(400).json({
        error: "All fields required (name, email, password, subject)",
      });
    }

    const exists = await DemoCandidate.findOne({
      email: email.toLowerCase(),
    });
    if (exists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // resolve subject info
    const subj = await Subject.findById(subjectId).lean();
    if (!subj) {
      return res.status(400).json({ error: "Invalid subjectId" });
    }

    const timeLimitMinutes = subj.timeLimitMinutes || 60;
    const hashed = await bcrypt.hash(password, 10);

    const candidate = await DemoCandidate.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: "democandidate",
      candidateId: `D-${String(Date.now()).slice(-5)}`,
      batchNumber: "DEMO",
      createdBy: me._id,
      subjectId: String(subj._id),
      subjectName: subj.name || "Assessment",
      timeLimitMinutes,
    });

    res.status(201).json({
      _id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      subjectId: candidate.subjectId,
      subjectName: candidate.subjectName,
      candidateId: candidate.candidateId,
      timeLimitMinutes: candidate.timeLimitMinutes,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

exports.removeCandidate = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    const cand = await DemoCandidate.findOne({
      _id: req.params.userId,
      createdBy: me._id,
    });
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    await cand.deleteOne();
    res.json({ message: "Candidate deleted" });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};

// ==========================================
// ✅ QUESTIONS CRUD
// ==========================================

// 1. uploadQuestions
// Frontend sends JSON array like:
// [
//   {
//     question: "text",
//     options: ["A","B","C","D"],
//     correctAnswer: "B" OR 2,
//     timeLimit: 45   (seconds or mins, we normalize)
//   },
//   ...
// ]
exports.uploadQuestions = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    const subjectId = req.params.id;

    // Frontend is sending plain JSON (NOT FormData right now)
    const questions = req.body;

    // 1. check array
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "No questions received" });
    }

    // 2. validate each row
    const invalid = questions.find(
      (q) =>
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        !q.correctAnswer
    );
    if (invalid) {
      return res.status(400).json({
        error:
          "Invalid question row. Need question, options[>=2], correctAnswer",
      });
    }

    // 3. normalize rows for DB
    const docs = questions.map((q) => ({
      subject: String(subjectId),
      question: q.question,
      options: q.options,
      correctAnswer: String(q.correctAnswer),
      // support "Time(sec)" or timeLimit or timeLimitMinutes
      timeLimit:
        Number(q["Time(sec)"]) ||
        Number(q.timeLimit) ||
        Number(q.timeLimitMinutes) ||
        60,
      createdBy: me._id || null,
    }));

    // 4. insert
    await DemoExamQuestion.insertMany(docs);

    // 5. done
    return res.json({
      success: true,
      total: docs.length,
      message: "Questions uploaded successfully",
    });
  } catch (err) {
    console.error("❌ Error in uploadQuestions:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 2. getSubjectQuestions
exports.getSubjectQuestions = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    const subjectId = req.params.id;

    // make sure the subject belongs to this demo admin
    const subject = await Subject.findOne({
      _id: subjectId,
      owner: me._id,
    }).lean();
    if (!subject) {
      return res
        .status(404)
        .json({ error: "Subject not found / not owned by you" });
    }

    const qs = await DemoExamQuestion.find({ subject: String(subjectId) })
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      qs.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        timeLimit: q.timeLimit ?? 60,
        createdAt: q.createdAt,
      }))
    );
  } catch (err) {
    console.error("❌ getSubjectQuestions error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 3. deleteQuestion
exports.deleteQuestion = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    const { qid } = req.params;

    const q = await DemoExamQuestion.findById(qid);
    if (!q) {
      return res.status(404).json({ error: "Question not found" });
    }

    // verify that the subject of this question belongs to this demo admin
    const subject = await Subject.findOne({
      _id: q.subject,
      owner: me._id,
    });
    if (!subject) {
      return res
        .status(403)
        .json({ error: "Forbidden: you do not own this question's subject" });
    }

    await q.deleteOne();
    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error("❌ deleteQuestion error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 4. downloadTemplate
exports.downloadTemplate = async (req, res) => {
  try {
    // Matches frontend expectation:
    // Question | Option1 | Option2 | Option3 | Option4 | CorrectAnswer | Time(sec)
    const data = [
      {
        Question: "What is 2 + 2?",
        Option1: "1",
        Option2: "2",
        Option3: "3",
        Option4: "4",
        CorrectAnswer: "4",
        "Time(sec)": "60",
      },
      {
        Question: "Capital of India?",
        Option1: "Mumbai",
        Option2: "Chennai",
        Option3: "Kolkata",
        Option4: "Delhi",
        CorrectAnswer: "Delhi",
        "Time(sec)": "90",
      },
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, "Questions");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Question_Template.xlsx"'
    );
    res.type(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buf);
  } catch (err) {
    console.error("❌ Error generating template:", err);
    return res.status(500).json({ error: "Failed to generate template" });
  }
};

// =========================================
// ✅ REQUESTS & RESULTS
// =========================================
exports.requestExtension = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    console.log(`📩 Extension request from ${me.email}`);
    res.json({ message: "Extension request submitted to Super Admin" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.requestLiveMonitor = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);
    console.log(`📩 Live monitor access request from ${me.email}`);
    res.json({ message: "Live monitor access request submitted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Result fetch, scoped to this demo admin
exports.getResults = async (req, res) => {
  try {
    const me = await ensureDemoAdmin(req);

    // We assume ResultD is being saved with createdBy = demo admin _id
    const rawResults = await ResultD.find({ createdBy: me._id })
      .sort({ createdAt: -1 })
      .lean();

    const shaped = rawResults.map((r) => ({
      _id: r._id,

      // candidate info
      candidate: {
        name: r.candidateName || r.candidate?.name || "—",
        email: r.candidateEmail || r.candidate?.email || "—",
      },

      // subject info
      subject: {
        name:
          r.subjectName ||
          r.subject?.name ||
          r.subject ||
          r.subjectId ||
          "—",
        id:
          r.subject?._id ||
          r.subjectId ||
          (typeof r.subject === "string" ? r.subject : "—"),
      },

      // score
      score: r.score ?? 0,
      total: r.total ?? 0,
      percentage:
        r.total && r.total > 0
          ? ((r.score / r.total) * 100).toFixed(1) + "%"
          : "0%",

      // snapshots metadata (not binary/image blobs here)
      snapshots: r.snapshots || [],

      // wrong answers etc.
      answers: r.answers || [],
      createdAt: r.createdAt,
    }));

    res.json(shaped);
  } catch (e) {
    console.error("❌ Error in getResults:", e);
    res.status(500).json({ error: e.message });
  }
};
