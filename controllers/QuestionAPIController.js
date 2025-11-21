const QuestionModel = require("../models/QuestionModel");
const XLSX = require("xlsx");

// ✅ Fetch Questions by Subject
const getQuestionsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const questions = await QuestionModel.find({ subjectId }).sort({ createdAt: -1 });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions", details: err.message });
  }
};

// ✅ Add Question
const addQuestion = async (req, res) => {
  try {
    const { subjectId, question, options, correctAnswer } = req.body;
    const newQ = await QuestionModel.create({
      subjectId,
      questionText: question,           // ✅ match model
      options,
      correctAnswerIndex: correctAnswer, // ✅ match model
    });
    res.status(201).json({ message: "Question added", newQ });
  } catch (err) {
    res.status(500).json({ error: "Failed to add question", details: err.message });
  }
};

// ✅ Update Question
const updateQuestion = async (req, res) => {
  try {
    const updated = await QuestionModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: "Question updated", updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update question", details: err.message });
  }
};

// ✅ Delete Question
const deleteQuestion = async (req, res) => {
  try {
    await QuestionModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete question", details: err.message });
  }
};

// ✅ Upload Excel
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const buffer = req.file.buffer;
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const formatted = data.map((row) => ({
      subjectId: req.body.subjectId,
      questionText: row.Question, // ✅
      options: [row.Option1, row.Option2, row.Option3, row.Option4],
      correctAnswerIndex: parseInt(row.CorrectAnswer), // ✅
    }));

    await QuestionModel.insertMany(formatted);
    res.status(200).json({ message: "Excel uploaded and questions added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to process Excel upload", details: err.message });
  }
};

// ✅ Export Excel
const exportExcel = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const questions = await QuestionModel.find({ subjectId });

    if (!questions.length) {
      return res.status(404).json({ error: "No questions found for this subject" });
    }

    const data = questions.map((q) => ({
      Question: q.questionText,
      Option1: q.options[0],
      Option2: q.options[1],
      Option3: q.options[2],
      Option4: q.options[3],
      CorrectAnswer: q.correctAnswerIndex,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Disposition", 'attachment; filename="Questions.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to export Excel", details: err.message });
  }
};

module.exports = {
  getQuestionsBySubject,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  uploadExcel,
  exportExcel,
};
