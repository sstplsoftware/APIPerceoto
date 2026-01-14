const DemoExamResult = require("../models/demoExamResult.model");
const DemoExamQuestion = require("../models/demoExamQuestion.model");
const DemoCandidate = require("../models/DemoCandidate.model");

// =======================================
// ✅ Submit Demo Exam Result (Candidate Side)
// =======================================
exports.submitDemoResult = async (req, res) => {
  try {
    const { answers, subjectId } = req.body;
    const candidateDoc = req.user; // verified demo candidate from token

    if (!candidateDoc || candidateDoc.role !== "democandidate") {
      return res.status(403).json({ error: "Unauthorized candidate" });
    }

    // normalize answers object { [qid]: selectedOption } → array
    const normalizedAnswers = Object.keys(answers || {}).map((qid) => ({
      questionId: qid,
      selectedOption: answers[qid],
    }));

    const questions = await DemoExamQuestion.find({ subject: subjectId }).lean();
    let score = 0;

    const evaluatedAnswers = normalizedAnswers.map((a) => {
      const q = questions.find((qq) => qq._id.toString() === a.questionId);
      const isCorrect = q?.correctAnswer === a.selectedOption;
      if (isCorrect) score++;
      return {
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    // ✅ Pull demo admin ID from candidate record
    const fullCand = await DemoCandidate.findById(candidateDoc._id).lean();
    const createdBy = fullCand?.createdBy || null;

    // ✅ Save with admin linkage
    const result = await DemoExamResult.create({
      candidate: candidateDoc._id,
      subject: subjectId,
      createdBy, // ← ensures filtering by demo admin
      answers: evaluatedAnswers,
      score,
      totalQuestions,
      percentage,
    });

    const lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    res.status(201).json({
      message: "Result saved",
      score,
      total: totalQuestions,
      percentage,
      lockUntil,
      resultId: result._id,
    });
  } catch (err) {
    console.error("❌ Demo result error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =======================================
// ✅ Get All Results (Demo Admin Side)
// =======================================
exports.getDemoResults = async (req, res) => {
  try {
    const me = req.user;
    if (!me || me.role !== "demoadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ✅ Only results belonging to this demo admin
    const results = await DemoExamResult.find({ createdBy: me._id })
      .populate("candidate", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(results);
  } catch (err) {
    console.error("❌ getDemoResults error:", err);
    res.status(500).json({ error: err.message });
  }
};
