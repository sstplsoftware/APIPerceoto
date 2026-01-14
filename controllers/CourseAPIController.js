const CourseModel = require("../models/CourseModel");

const getAllCourses = async (req, res) => {
  try {
    const courses = await CourseModel.find().sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

const createCourse = async (req, res) => {
  try {
    const course = await CourseModel.create(req.body);
    res.status(201).json({ message: "Course created", course });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to create course" });
  }
};

const updateCourse = async (req, res) => {
  try {
    const updated = await CourseModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: "Course updated", updated });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to update course" });
  }
};

const deleteCourse = async (req, res) => {
  try {
    await CourseModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Course deleted" });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to delete course" });
  }
};

module.exports = { getAllCourses, createCourse, updateCourse, deleteCourse };
