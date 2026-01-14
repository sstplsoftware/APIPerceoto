const express = require("express");
const router = express.Router();
const {
  addDemoQuestion,
  getDemoQuestionsBySubject,
  getQuestionsBySubjectId,
} = require("../controllers/demoExamQuestion.controller");

// add questions
router.post("/add", addDemoQuestion);

// old style by subject string
router.get("/:subject", getDemoQuestionsBySubject);

// bridge for frontend DemoExamPage.jsx
// NOTE: not conflicting because path starts with /demo-subjects/
router.get(
  "/demo-subjects/:subjectId/questions",
  getQuestionsBySubjectId
);

module.exports = router;
