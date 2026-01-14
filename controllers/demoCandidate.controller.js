const bcrypt = require("bcryptjs");
const DemoCandidate = require("../models/DemoCandidate.model");
const Subject = require("../models/Subject");
const jwt = require("jsonwebtoken");

// ===============================================
// ✅ Create a new demo candidate (Demo Admin use)
// body: { name, email, password, subjectId }
// ===============================================
exports.createDemoCandidate = async (req, res) => {
  try {
    const { name, email, password, subjectId } = req.body;
    const userId = req.user?.id || req.user?._id; // demo admin id

    if (!name || !email || !password || !subjectId) {
      return res.status(400).json({ error: "All fields required" });
    }

    // fetch subject info
    const subj = await Subject.findById(subjectId);
    if (!subj) {
      return res.status(400).json({ error: "Invalid subjectId" });
    }

    // optional per-subject exam duration, else fallback 60
    const timeLimitMinutes = subj.timeLimitMinutes || 60;

    const hashedPassword = await bcrypt.hash(password.toString(), 10);

    const candidate = await DemoCandidate.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      subjectId,
      subjectName: subj.name || "Assessment",
      timeLimitMinutes,
      createdBy: userId,
      role: "democandidate",
      batchNumber: "DEMO",
      candidateId: "D-" + String(Date.now()).slice(-5),
    });

    res.status(201).json({
      message: "Candidate created successfully",
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        subjectId: candidate.subjectId,
        subjectName: candidate.subjectName,
        timeLimitMinutes: candidate.timeLimitMinutes,
        candidateId: candidate.candidateId,
      },
    });
  } catch (err) {
    console.error("❌ Error creating demo candidate:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create demo candidate" });
  }
};

// ===============================================
// ✅ Get all demo candidates for the logged-in Demo Admin
// ===============================================
exports.getAllDemoCandidates = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const candidates = await DemoCandidate.find({ createdBy: userId })
      .select("-password")
      .lean();

    // We already stored subjectName, so return it
    res.json(
      candidates.map((c) => ({
        ...c,
        subjectName: c.subjectName || "",
      }))
    );
  } catch (err) {
    console.error("❌ Error fetching demo candidates:", err);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};

// ===============================================
// ✅ Delete demo candidate
// ===============================================
exports.deleteDemoCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    await DemoCandidate.findByIdAndDelete(id);
    res.json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting demo candidate:", err);
    res.status(500).json({ error: "Failed to delete candidate" });
  }
};

// ===============================================
// ✅ Demo Candidate Login (6h token)
// returns data needed for exam flow
// ===============================================
exports.demoCandidateLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email and password required" });

    const candidate = await DemoCandidate.findOne({
      email: email.toLowerCase(),
    });
    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const isMatch = await bcrypt.compare(password, candidate.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid credentials" });

    // JWT 6h
    const token = jwt.sign(
      { id: candidate._id, role: "democandidate" },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.json({
      message: "Login successful",
      token,
      candidate: {
        id: candidate._id.toString(),
        name: candidate.name,
        email: candidate.email,
        role: "democandidate",
        subjectId: candidate.subjectId?.toString() || "",
        subjectName: candidate.subjectName || "Assessment",
        timeLimitMinutes: candidate.timeLimitMinutes || 60,
        candidateId: candidate.candidateId || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};
