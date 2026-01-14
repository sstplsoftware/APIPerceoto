const DemoExamQuestion = require("../models/demoExamQuestion.model");

// Add Question
exports.addDemoQuestion = async (req, res) => {
  try {
    const {
      subject, // string/subjectId or subjectName
      question,
      options,
      correctAnswer,
      timeLimit,
      createdBy,
    } = req.body;

    const newQ = await DemoExamQuestion.create({
      subject,
      question,
      options,
      correctAnswer,
      timeLimit,
      createdBy,
    });

    res.status(201).json({ message: "Question added", newQ });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch questions by subject NAME or ID stored in question.subject
exports.getDemoQuestionsBySubject = async (req, res) => {
  try {
    const { subject } = req.params;
    const questions = await DemoExamQuestion.find({
      subject,
    })
      .select("question options")
      .lean();

    res.status(200).json(
      questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔥 NEW: bridge for DemoExamPage.jsx
// GET /api/demo-subjects/:subjectId/questions
// We just proxy to getDemoQuestionsBySubject using :subjectId
exports.getQuestionsBySubjectId = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const questions = await DemoExamQuestion.find({
      subject: subjectId, // we store "subject" field as subjectId string
    })
      .select("question options")
      .lean();

    res.status(200).json(
      questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
