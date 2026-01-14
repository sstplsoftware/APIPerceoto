// ===============================================
// 🧩 routes/superadmin.js (FINAL VERSION)
// ===============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

// Models
const User = require("../models/User");
const Result = require("../models/ResultD") || require("../models/Result"); // pick what's present in your backend
const Course =
  require("../models/CourseModel") || require("../models/Course") || null;
const Subject =
  require("../models/SubjectModel") || require("../models/Subject") || null;
const QuestionModel =
  require("../models/QuestionModel") || require("../models/Question") || null;


// ====================================================
// 👥 DEMO CANDIDATE MANAGEMENT (Super Admin View)
// ====================================================
const DemoCandidate = require("../models/DemoCandidate.model");


// Middleware
const { verifyToken } = require("../middleware/auth");

// ====================================================
// 🧠 Middleware: Only allow Super Admin
// ====================================================
const requireSuper = async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u || u.role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "Access denied: Super Admin only" });
    }
    next();
  } catch (err) {
    console.error("requireSuper error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================
// 🔁 Helper: Emit DemoAdmin live status to SuperAdmin room
// ====================================================
// Called after create/extend/deactivate demo admin
async function emitDemoUpdate(io) {
  if (!io) return;
  const demos = await User.find({ role: "demoadmin" })
    .select("name email status expiresAt createdAt")
    .lean();

  io.to("superadmin-room").emit("demo:updated", demos);
}

// ====================================================
// 👑 ADMIN MANAGEMENT (role = "admin")
// ====================================================

// GET all Admins
router.get("/admins", verifyToken, requireSuper, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .lean();
    res.json(admins);
  } catch (err) {
    console.error("GET /admins error:", err);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// CREATE Admin
router.post("/admins", verifyToken, requireSuper, async (req, res) => {
  try {
    const { name, email, password = "Admin@123" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: "Email already exists" });

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "admin",
      verified: true,
      status: "active",
      createdBy: req.user.id,
    });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
  } catch (err) {
    console.error("POST /admins error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET all demo candidates (with optional filter by DemoAdmin)
router.get(
  "/demo-candidates",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { demoAdminId } = req.query; // optional filter
      const filter = demoAdminId ? { createdBy: demoAdminId } : {};

      const list = await DemoCandidate.find(filter)
        .populate("createdBy", "name email role") // show who created them
        .sort({ createdAt: -1 })
        .lean();

      res.json(list);
    } catch (err) {
      console.error("GET /superadmin/demo-candidates error:", err);
      res.status(500).json({ error: "Failed to fetch demo candidates" });
    }
  }
);

// UPDATE Admin (name/email/status/password)
router.put("/admins/:id", verifyToken, requireSuper, async (req, res) => {
  try {
    const { name, email, password, status } = req.body;
    const update = {};

    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (status) update.status = status;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      update.password = hash;
    }

    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: "admin" },
      update,
      { new: true }
    ).select("-password");

    if (!updated)
      return res.status(404).json({ error: "Admin not found" });

    res.json(updated);
  } catch (err) {
    console.error("PUT /admins/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE Admin
router.delete("/admins/:id", verifyToken, requireSuper, async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({
      _id: req.params.id,
      role: "admin",
    });
    if (!deleted)
      return res.status(404).json({ error: "Admin not found" });

    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("DELETE /admins/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// ⏳ DEMO ADMIN MANAGEMENT (role = "demoadmin")
// ====================================================

// GET all demo admins
router.get("/demo-admins", verifyToken, requireSuper, async (req, res) => {
  try {
    const demos = await User.find({ role: "demoadmin" })
      .select("-password")
      .lean();
    res.json(demos);
  } catch (err) {
    console.error("GET /demo-admins error:", err);
    res.status(500).json({ error: "Failed to fetch demo admins" });
  }
});

// CREATE demo admin (with expiry window)
router.post("/demo-admins", verifyToken, requireSuper, async (req, res) => {
  try {
    const {
      name,
      email,
      password = "Demo@123",
      days = 30,
      candidateLimit = 5,
    } = req.body;

    if (!name || !email)
      return res.status(400).json({ error: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ error: "Demo admin already exists" });

    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    );

    const demoAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "demoadmin",
      verified: true,
      status: "active",
      expiresAt,
      candidateLimit,
      candidatesCreated: 0,
      createdBy: req.user.id,
    });

    // notify all Super Admin dashboards via socket
    const io = req.app.get("io");
    await emitDemoUpdate(io);

    res.status(201).json({
      _id: demoAdmin._id,
      name: demoAdmin.name,
      email: demoAdmin.email,
      status: demoAdmin.status,
      expiresAt: demoAdmin.expiresAt,
    });
  } catch (err) {
    console.error("POST /demo-admins error:", err);
    res.status(500).json({ error: err.message });
  }
});

// EXTEND demo admin trial
router.put(
  "/demo-admins/:id/extend",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { days = 15 } = req.body;
      const demo = await User.findOne({
        _id: req.params.id,
        role: "demoadmin",
      });

      if (!demo)
        return res
          .status(404)
          .json({ error: "Demo admin not found" });

      // if already expired, start from now; else add on top of current expiresAt
      const baseTime = demo.expiresAt && demo.expiresAt > new Date()
        ? demo.expiresAt.getTime()
        : Date.now();

      demo.expiresAt = new Date(
        baseTime + days * 24 * 60 * 60 * 1000
      );
      demo.status = "active";
      await demo.save();

      const io = req.app.get("io");
      await emitDemoUpdate(io);

      res.json({
        message: `Extended by ${days} days`,
        expiresAt: demo.expiresAt,
      });
    } catch (err) {
      console.error("PUT /demo-admins/:id/extend error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DEACTIVATE / EXPIRE demo admin
router.put(
  "/demo-admins/:id/deactivate",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const demo = await User.findOne({
        _id: req.params.id,
        role: "demoadmin",
      });

      if (!demo)
        return res
          .status(404)
          .json({ error: "Demo admin not found" });

      demo.status = "expired";
      demo.expiresAt = new Date();
      await demo.save();

      const io = req.app.get("io");
      await emitDemoUpdate(io);

      res.json({ message: "Demo admin deactivated" });
    } catch (err) {
      console.error("PUT /demo-admins/:id/deactivate error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// UPDATE demo admin general details (name/email/password/status)
router.put(
  "/demo-admins/:id",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { name, email, password, status } = req.body;
      const update = {};

      if (name) update.name = name;
      if (email) update.email = email.toLowerCase();
      if (status) update.status = status;
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        update.password = hash;
      }

      const updated = await User.findOneAndUpdate(
        { _id: req.params.id, role: "demoadmin" },
        update,
        { new: true }
      ).select("-password");

      if (!updated)
        return res
          .status(404)
          .json({ error: "Demo admin not found" });

      const io = req.app.get("io");
      await emitDemoUpdate(io);

      res.json(updated);
    } catch (err) {
      console.error("PUT /demo-admins/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE demo admin
router.delete(
  "/demo-admins/:id",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const deleted = await User.findOneAndDelete({
        _id: req.params.id,
        role: "demoadmin",
      });
      if (!deleted)
        return res
          .status(404)
          .json({ error: "Demo admin not found" });

      const io = req.app.get("io");
      await emitDemoUpdate(io);

      res.json({ message: "Demo admin deleted" });
    } catch (err) {
      console.error("DELETE /demo-admins/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ====================================================
// 👤 USER / CANDIDATE MANAGEMENT (any role except superadmin)
// Used by <UserManager />
// ====================================================

// GET all users except superadmin
router.get("/users", verifyToken, requireSuper, async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: "superadmin" },
    })
      .select("-password")
      .lean();

    res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// CREATE user (candidate/admin/demoadmin/etc.)
router.post("/users", verifyToken, requireSuper, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "candidate",
      active = true,
      candidateId,
      batchNumber,
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email, password required" });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: "Email already exists" });

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      status: active ? "active" : "suspended",
      verified: true,
      candidateId,
      batchNumber,
      createdBy: req.user.id,
    });

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      active: newUser.status === "active",
    });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user
router.put("/users/:id", verifyToken, requireSuper, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      active,
      candidateId,
      batchNumber,
    } = req.body;

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (role) update.role = role;
    if (candidateId !== undefined) update.candidateId = candidateId;
    if (batchNumber !== undefined) update.batchNumber = batchNumber;
    if (active !== undefined) {
      update.status = active ? "active" : "suspended";
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      update.password = hash;
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select("-password");

    if (!updated)
      return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete("/users/:id", verifyToken, requireSuper, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE active/suspended
router.put(
  "/users/:id/status",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { active } = req.body;
      const user = await User.findById(req.params.id);
      if (!user)
        return res.status(404).json({ error: "User not found" });

      user.status = active ? "active" : "suspended";
      await user.save();

      res.json({
        message: "Status updated",
        active: user.status === "active",
      });
    } catch (err) {
      console.error("PUT /users/:id/status error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// RESET password for any user
router.patch(
  "/users/:id/reset-password",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword)
        return res
          .status(400)
          .json({ error: "New password required" });

      const hash = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(req.params.id, {
        password: hash,
      });

      res.json({ message: "Password reset successful" });
    } catch (err) {
      console.error(
        "PATCH /users/:id/reset-password error:",
        err
      );
      res.status(500).json({ error: err.message });
    }
  }
);

// ====================================================
// 📚 COURSE MANAGEMENT (Super Admin full control)
// used by CourseManager.jsx
// ====================================================

if (Course) {
  // GET all courses
  router.get("/courses", verifyToken, requireSuper, async (req, res) => {
    try {
      const list = await Course.find().lean();
      res.json(list);
    } catch (err) {
      console.error("GET /courses error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE course
  router.post("/courses", verifyToken, requireSuper, async (req, res) => {
    try {
      const { title, desc } = req.body;
      if (!title)
        return res
          .status(400)
          .json({ error: "Course title required" });

      const course = await Course.create({ title, desc });
      res.status(201).json(course);
    } catch (err) {
      console.error("POST /courses error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE course
  router.put("/courses/:id", verifyToken, requireSuper, async (req, res) => {
    try {
      const { title, desc } = req.body;
      const updated = await Course.findByIdAndUpdate(
        req.params.id,
        { title, desc },
        { new: true }
      );
      if (!updated)
        return res
          .status(404)
          .json({ error: "Course not found" });
      res.json(updated);
    } catch (err) {
      console.error("PUT /courses/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE course
  router.delete(
    "/courses/:id",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const deleted = await Course.findByIdAndDelete(
          req.params.id
        );
        if (!deleted)
          return res
            .status(404)
            .json({ error: "Course not found" });
        res.json({ message: "Course deleted successfully" });
      } catch (err) {
        console.error("DELETE /courses/:id error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );
}

// ====================================================
// 🧠 SUBJECT MANAGEMENT (Super Admin full control)
// used by SubjectManager.jsx
// ====================================================

if (Subject) {
  // GET all subjects (or by courseId if provided ?courseId=)
  router.get("/subjects", verifyToken, requireSuper, async (req, res) => {
    try {
      const { courseId } = req.query;
      const filter = courseId ? { courseId } : {};
      const list = await Subject.find(filter).lean();
      res.json(list);
    } catch (err) {
      console.error("GET /subjects error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE subject
  router.post("/subjects", verifyToken, requireSuper, async (req, res) => {
    try {
      const { courseId, name, description } = req.body;
      if (!courseId || !name)
        return res.status(400).json({
          error: "courseId and subject name required",
        });

      const sub = await Subject.create({
        courseId,
        name,
        description,
      });
      res.status(201).json(sub);
    } catch (err) {
      console.error("POST /subjects error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE subject
  router.put(
    "/subjects/:id",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const { courseId, name, description } = req.body;

        const updated = await Subject.findByIdAndUpdate(
          req.params.id,
          { courseId, name, description },
          { new: true }
        );
        if (!updated)
          return res
            .status(404)
            .json({ error: "Subject not found" });

        res.json(updated);
      } catch (err) {
        console.error("PUT /subjects/:id error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // DELETE subject
  router.delete(
    "/subjects/:id",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const deleted = await Subject.findByIdAndDelete(
          req.params.id
        );
        if (!deleted)
          return res
            .status(404)
            .json({ error: "Subject not found" });
        res.json({ message: "Subject deleted successfully" });
      } catch (err) {
        console.error("DELETE /subjects/:id error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );
}

// ====================================================
// ❓ QUESTION MANAGEMENT (Super Admin full control)
// used by QuestionManager.jsx
// ====================================================

if (QuestionModel) {
  // GET questions by subjectId
  router.get(
    "/questions/:subjectId",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const list = await QuestionModel.find({
          subjectId: req.params.subjectId,
        }).lean();
        res.json(list);
      } catch (err) {
        console.error("GET /questions/:subjectId error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ADD 1 question manually
  router.post(
    "/questions",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const { subjectId, question, options, correctAnswer } =
          req.body;

        if (
          !subjectId ||
          !question ||
          !options ||
          !Array.isArray(options) ||
          options.length < 4
        ) {
          return res.status(400).json({
            error: "subjectId, question, 4 options required",
          });
        }

        const newQ = await QuestionModel.create({
          subjectId,
          questionText: question,
          options,
          correctAnswerIndex: correctAnswer, // 1-4 index from UI
        });

        res.status(201).json(newQ);
      } catch (err) {
        console.error("POST /questions error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // UPDATE question
  router.put(
    "/questions/:id",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const { question, options, correctAnswer } = req.body;
        const update = {};
        if (question) update.questionText = question;
        if (options) update.options = options;
        if (correctAnswer !== undefined)
          update.correctAnswerIndex = correctAnswer;

        const updated = await QuestionModel.findByIdAndUpdate(
          req.params.id,
          update,
          { new: true }
        );

        if (!updated)
          return res
            .status(404)
            .json({ error: "Question not found" });

        res.json(updated);
      } catch (err) {
        console.error("PUT /questions/:id error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // DELETE question
  router.delete(
    "/questions/:id",
    verifyToken,
    requireSuper,
    async (req, res) => {
      try {
        const deleted = await QuestionModel.findByIdAndDelete(
          req.params.id
        );
        if (!deleted)
          return res
            .status(404)
            .json({ error: "Question not found" });

        res.json({ message: "Question deleted" });
      } catch (err) {
        console.error("DELETE /questions/:id error:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // NOTE:
  // Your Excel upload / export endpoints already exist in other routes
  // (`/api/questions/upload-excel`, `/api/questions/export-excel/:subjectId`)
  // Frontend QuestionManager is already calling those, so we don't duplicate here.
}

// ====================================================
// 🛰 LIVE MONITOR EMAIL CONFIG
// used by LiveMonitorManager.jsx
// ====================================================

// GET all monitor emails
router.get(
  "/live-monitors",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const list = await LiveMonitor.find()
        .sort({ createdAt: -1 })
        .lean();
      res.json(list);
    } catch (err) {
      console.error("GET /live-monitors error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ADD or UPDATE monitor email
router.post(
  "/live-monitors",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const { email, active = true } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ error: "Email is required" });

      // upsert by email
      let monitor = await LiveMonitor.findOne({ email });
      if (monitor) {
        monitor.active = active;
        await monitor.save();
      } else {
        monitor = await LiveMonitor.create({ email, active });
      }

      res.status(201).json(monitor);
    } catch (err) {
      console.error("POST /live-monitors error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE monitor email
router.delete(
  "/live-monitors/:id",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const removed = await LiveMonitor.findByIdAndDelete(
        req.params.id
      );
      if (!removed)
        return res
          .status(404)
          .json({ error: "Monitor not found" });

      res.json({ message: "Removed successfully" });
    } catch (err) {
      console.error("DELETE /live-monitors/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ====================================================
// 📤 GLOBAL RESULT EXPORT
// used by ReportsAnalytics.jsx -> currently indirect
// ====================================================

router.get(
  "/global-results/export",
  verifyToken,
  requireSuper,
  async (req, res) => {
    try {
      const results = await Result.find().lean();

      if (!results.length) {
        return res
          .status(404)
          .json({ error: "No results found" });
      }

      const data = results.map((r, i) => ({
        SNo: i + 1,
        CandidateID: r.candidateId || r.candidateID || r.email,
        Name: r.name || r.candidateName,
        Email: r.email,
        Score:
          r.score && r.total
            ? `${r.score} / ${r.total}`
            : r.score,
        Batch: r.batchNumber || r.batch || "",
        SubmittedOn: new Date(r.createdAt).toLocaleString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "GlobalResults");

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=GlobalResults.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (err) {
      console.error(
        "GET /global-results/export error:",
        err
      );
      res.status(500).json({ error: err.message });
    }
  }
);

// ====================================================
// 📊 DASHBOARD OVERVIEW STATS
// feeds <OverviewSection />
// ====================================================

router.get("/overview", verifyToken, requireSuper, async (req, res) => {
  try {
    const [
      adminCount,
      demoCount,
      candidateCount,
      activeDemos,
    ] = await Promise.all([
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "demoadmin" }),
      User.countDocuments({ role: "candidate" }),
      User.countDocuments({
        role: "demoadmin",
        status: "active",
        expiresAt: { $gte: new Date() },
      }),
    ]);

    // TODO: integrate warnings count when snapshot/violation model is hooked
    const warningsToday = 0;

    res.json({
      admins: adminCount,
      demos: demoCount,
      candidates: candidateCount,
      activeDemos,
      warningsToday,
    });
  } catch (err) {
    console.error("GET /overview error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
