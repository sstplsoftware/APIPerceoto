const DemoExamCandidate = require("../models/demoExamCandidate.model");
const jwt = require("jsonwebtoken");

exports.registerDemoCandidate = async (req, res) => {
  try {
    const { name, email, phone, city, subject, createdBy } = req.body;

    const existing = await DemoExamCandidate.findOne({ email });
    if (existing) return res.status(400).json({ error: "Candidate already exists" });

    const candidate = await DemoExamCandidate.create({
      name,
      email,
      phone,
      city,
      subject,
      createdBy,
      batchNumber: "BATCH-" + Math.floor(1000 + Math.random() * 9000),
      candidateId: "CAND-" + Math.floor(100000 + Math.random() * 900000),
    });

    res.status(201).json({ message: "Demo candidate created", candidate });
  } catch (err) {
    console.error("❌ Demo candidate creation error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.loginDemoCandidate = async (req, res) => {
  try {
    const { email } = req.body;
    const candidate = await DemoExamCandidate.findOne({ email });
    if (!candidate) return res.status(400).json({ error: "Invalid Email" });

    const token = jwt.sign(
      { id: candidate._id, role: "democandidate" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      candidate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
