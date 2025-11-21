// ================================================
//  RESULT API CONTROLLER (Assessment)
//  Adds courseTitle + subjectName automatically
// ================================================
const mongoose = require('mongoose');

const AssessmentResult = require("../models/ResultAPIModel");
const CourseModel = require("../models/CourseModel");
const SubjectModel = require("../models/SubjectModel");

// ------------------------------------------------
// 1️⃣ Save New Assessment Result
// ------------------------------------------------
const saveResult = async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Incoming Result Payload:", data);

    // ------------------------------------------------
    // FETCH REAL COURSE TITLE
    // ------------------------------------------------
    let courseTitle = "Unknown Course";

    if (data.courseId) {
      const course = await CourseModel.findById(data.courseId).lean();
      if (course) {
        courseTitle = course.title || "Unknown Course";
      }
    }

    // ------------------------------------------------
    // FETCH REAL SUBJECT NAME
    // ------------------------------------------------
    let subjectName = "Unknown Subject";

    if (data.subjectId) {
      const subject = await SubjectModel.findById(data.subjectId).lean();
      if (subject) {
        subjectName = subject.name || "Unknown Subject";
      }
    }

    // ------------------------------------------------
    // FINAL DATA ATTACHMENT
    // ------------------------------------------------
    const finalData = {
      ...data,
      courseTitle,
      subjectName,
    };

    const result = new AssessmentResult(finalData);
    await result.save();

    res.status(201).json({
      success: true,
      message: "Result saved successfully",
      resultId: result._id,
    });

  } catch (err) {
    console.error("❌ Result Save Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ------------------------------------------------
// 2️⃣ Get All Results of a User
// ------------------------------------------------
const getUserResults = async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await AssessmentResult.find({
      $or: [{ userId }, { userEmail: userId }],
    }).sort({ createdAt: -1 });

    res.json({ results });

  } catch (err) {
    console.error("❌ getUserResults Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------
// 3️⃣ Get Single Result by ID
// ------------------------------------------------
const getResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    let result;

    if (mongoose.Types.ObjectId.isValid(resultId)) {
      // Query by MongoDB _id only if valid ObjectId
      result = await AssessmentResult.findById(resultId);
    }

    if (!result) {
      // If not found or id invalid, fallback to candidateId query
      result = await AssessmentResult.findOne({ candidateId: resultId });
    }

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.json({ result });
  } catch (err) {
    console.error("❌ getResultById Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  saveResult,
  getUserResults,
  getResultById,
};
