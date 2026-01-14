// routes/demoAdmin.routes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const ctrl = require("../controllers/demoAdmin.controller");

// If/when you want Excel upload via <input type="file" />, uncomment:
// const multer = require("multer");
// const upload = multer({ storage: multer.memoryStorage() });

// =========================================
// 🧩 DEMO ADMIN ROUTES (Protected by JWT)
// =========================================

// ✅ Dashboard overview
router.get("/me", verifyToken, ctrl.getDemoAdminInfo);

// ✅ Subjects
router.get("/subjects", verifyToken, ctrl.listSubjects);
router.post("/subjects", verifyToken, ctrl.createSubject);
router.delete("/subjects/:id", verifyToken, ctrl.deleteSubject);

// ✅ Subject timer update (new)
router.post(
  "/subjects/:id/timer",
  verifyToken,
  ctrl.updateSubjectTimer
);

// ✅ Get all questions for one subject (new)
router.get(
  "/subjects/:id/questions",
  verifyToken,
  ctrl.getSubjectQuestions
);

// ✅ Delete a single question (new)
router.delete(
  "/questions/:qid",
  verifyToken,
  ctrl.deleteQuestion
);

// ✅ Candidates
router.get("/candidates", verifyToken, ctrl.listCandidates);
router.post("/candidates", verifyToken, ctrl.addCandidate);
router.delete("/candidates/:userId", verifyToken, ctrl.removeCandidate);

// ✅ Question Upload
// Frontend (current flow) sends JSON array of questions.
// So DO NOT use multer here, just read req.body:
router.post(
  "/subjects/:id/upload",
  verifyToken,
  ctrl.uploadQuestions
);

// If later you want to send Excel FormData with `file`, switch to:
// router.post(
//   "/subjects/:id/upload",
//   verifyToken,
//   upload.single("file"),
//   ctrl.uploadQuestions
// );

// ✅ Excel Template download
router.get(
  "/question-template",
  verifyToken,
  ctrl.downloadTemplate
);

// ✅ Requests (for extension / live monitor)
router.post("/extend-request", verifyToken, ctrl.requestExtension);
router.post("/live-monitor-request", verifyToken, ctrl.requestLiveMonitor);

// ✅ Demo Admin — Results
router.get("/results", verifyToken, ctrl.getResults);

module.exports = router;
