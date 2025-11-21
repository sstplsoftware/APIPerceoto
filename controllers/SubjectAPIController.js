const SubjectModel = require("../models/SubjectModel");
const CourseModel = require("../models/CourseModel");

const getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await CourseModel.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const subjects = await SubjectModel.find({ courseId }).sort({ createdAt: -1 });
    res.status(200).json({ courseName: course.title, subjects });
  } catch {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
};

const createSubject = async (req, res) => {
  try {
    const subject = await SubjectModel.create(req.body);
    res.status(201).json({ message: "Subject created", subject });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to create subject" });
  }
};

const updateSubject = async (req, res) => {
  try {
    const updated = await SubjectModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: "Subject updated", updated });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to update subject" });
  }
};

const deleteSubject = async (req, res) => {
  try {
    await SubjectModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Subject deleted" });

    const io = req.app.get("io");
    io.emit("analytics:update");
  } catch {
    res.status(500).json({ error: "Failed to delete subject" });
  }
};

// ✅ Get all subjects (for dropdowns / analytics)
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await SubjectModel.find().populate("courseId", "title");
    res.status(200).json(subjects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subjects", details: err.message });
  }
};


module.exports = {
  getSubjectsByCourse,
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
