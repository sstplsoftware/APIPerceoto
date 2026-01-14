// backend/services/feedbackService.js

const Question = require("../models/Question");
const Result = require("../models/Result");

// ⬆️ If your result model name is different, change ONLY this line

/* =====================================================
   CONFIG – SKILL EVALUATION THRESHOLDS
===================================================== */
const THRESHOLDS = {
  strong: 75,
  average: 50,
};

/* =====================================================
   HELPER – DECIDE SKILL LEVEL
===================================================== */
function getSkillLevel(percent) {
  if (percent >= THRESHOLDS.strong) return "Strong";
  if (percent >= THRESHOLDS.average) return "Average";
  return "Needs Improvement";
}

/* =====================================================
   🔥 CORE – SKILL AGGREGATION LOGIC (POINT 4)
===================================================== */
async function generateSkillAggregation(batchNumber, candidateId) {
  // 1️⃣ Load questions
  const questions = await Question.find({
    batchNumber,
    isPlaceholder: { $ne: true },
  }).lean();

  // 2️⃣ Load result
  const result = await Result.findOne({
    batchNumber,
    candidateId,
  }).lean();

  if (!result || !Array.isArray(result.answers)) return [];

  // 3️⃣ Map answers
  const answerMap = {};
  result.answers.forEach((ans) => {
    if (ans.questionId) {
      answerMap[ans.questionId.toString()] = ans.selectedOption;
    }
  });

  // 4️⃣ Aggregate by skill
  const skillStats = {};

  for (const q of questions) {
    const skill = q.skillCategory || "General";
    const weight = q.weightage || 1;

    const isCorrect =
      answerMap[q._id.toString()] === q.correctAnswer;

    if (!skillStats[skill]) {
      skillStats[skill] = { total: 0, correct: 0 };
    }

    skillStats[skill].total += weight;
    if (isCorrect) skillStats[skill].correct += weight;
  }

  // 5️⃣ Build summary
  return Object.keys(skillStats).map((skill) => {
    const s = skillStats[skill];
    const percentage =
      s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

    return {
      skill,
      total: s.total,
      correct: s.correct,
      percentage,
      level: getSkillLevel(percentage),
    };
  });
}
/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  generateSkillAggregation,
};
