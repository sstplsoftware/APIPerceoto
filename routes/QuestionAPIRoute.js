// ===============================================
// 🧩 Question API Route (Fixed)
// ===============================================
const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getQuestionsBySubject,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  uploadExcel,
  exportExcel,
} = require("../controllers/QuestionAPIController");

// 🧩 Multer In-Memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload-excel", upload.single("file"), uploadExcel);
router.get("/export-excel/:subjectId", exportExcel);

router.get("/:subjectId", getQuestionsBySubject);
router.post("/", addQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);


module.exports = router;
