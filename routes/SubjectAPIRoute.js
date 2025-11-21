const express = require("express");
const { getAllSubjects, getSubjectsByCourse, createSubject, deleteSubject } = require("../controllers/SubjectAPIController");
const router = express.Router();

router.get("/", getAllSubjects);
router.get("/:courseId", getSubjectsByCourse);
router.post("/", createSubject);
router.delete("/:id", deleteSubject);

module.exports = router;
