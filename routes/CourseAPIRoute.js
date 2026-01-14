const express = require("express");
const router = express.Router();
const {
  getAllCourses,
  createCourse,
  deleteCourse,
} = require("../controllers/CourseAPIController");

// Routes
router.get("/", getAllCourses);
router.post("/", createCourse);
router.delete("/:id", deleteCourse);

module.exports = router;
