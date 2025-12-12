// ===============================================
// 🧩 SSTPL EXAM SYSTEM BACKEND (index.js)
// ===============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const session = require("express-session");
require("dotenv").config();

// Core Models
const User = require("./models/User");
require("./models/ResultD");

// Routes
const feedbackAuthRoutes = require("./routes/feedbackAuthRoutes");
const authRoutes = require("./routes/authRoutes");
const candidateRoutes = require("./routes/candidate");
const adminRoutes = require("./routes/admin");
const excelUploadRoutes = require("./routes/excelUpload");
const resultRoutes = require("./routes/result");
const questionRoutes = require("./routes/questions");
const submitRoutes = require("./routes/submit");
const snapshotRoutes = require("./routes/snapshotRoutes");
const superAdminRoutes = require("./routes/superadmin");
const demoSetupRoutes = require("./routes/demoSetup");
const demoAdminRoutes = require("./routes/demoAdmin.routes");
const demoAuthRoutes = require("./routes/demoAuth.routes");
const demoCandidateRoutes = require("./routes/demoCandidate.routes");
const demoRoutes = require("./routes/demoRoutes");
const CourseAPIRoute = require("./routes/CourseAPIRoute");
const SubjectAPIRoute = require("./routes/SubjectAPIRoute");
const questionAPIRoute = require("./routes/QuestionAPIRoute");

// ⭐ DB Dump Route
const dbDumpRoutes = require("./routes/dbDump");

// assessment pre feed
const ResultAPIRoute = require("./routes/ResultAPIRoute");

// Demo Exam routes
const demoExamAuthRoutes = require("./routes/demoExamAuth.routes");
const demoExamQuestionRoutes = require("./routes/demoExamQuestion.routes");
const demoExamResultRoutes = require("./routes/demoExamResult.routes");

// Demo Snapshots routes (🆕)
const demoSnapshotRoutes = require("./routes/demoSnapshot.routes");

// Express + Socket.io
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

// ===============================================
// 🌐 ALLOWED CORS ORIGINS (Production Ready)
// ===============================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://percepto.sstpltech.com",
  "https://percepto.sstpltech.com",
  "https://www.percepto.sstpltech.com",
  process.env.FRONTEND_URL,
];

// ===============================================
// 🔵 SOCKET.IO CORS FIX
// ===============================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  path: "/socket.io",
});

app.set("io", io);

// ===============================================
// 🌐 EXPRESS CORS FOR APIs
// ===============================================
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile, postman etc.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("❌ CORS Blocked: " + origin));
      }
    },
    credentials: true,
  })
);

// ===============================================
// 🔧 Body parser
// ===============================================
app.use(express.json());
app.use(express.json({ limit: "10mb" }));

// ===============================================
// 📂 STATIC FILES
// ===============================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/uploads/demo-snapshots",
  express.static(path.join(__dirname, "uploads/demo-snapshots"))
);
app.use(
  "/uploads/snapshots",
  express.static(path.join(__dirname, "uploads/snapshots"))
);

// ===============================================
// 🔐 Sessions + Passport (Google Auth)
// ===============================================
app.use(
  session({
    secret: process.env.JWT_SECRET || "sstplsecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ===============================================
// 🚏 ROOT ROUTE (Fixes Cannot GET /)
// ===============================================
app.get("/", (req, res) => {
  res.send(
    "✅ SSTPL Percepto Backend is running. Use /health for status or /api/* for endpoints."
  );
});

// ===============================================
// 🚏 HEALTH CHECK
// ===============================================
app.get("/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// ===============================================
// 📌 ROUTES MOUNTING
// ===============================================
app.use("/api/feedbackauth", feedbackAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", candidateRoutes);
app.use("/api", adminRoutes);
app.use("/api", excelUploadRoutes);
app.use("/api", questionRoutes);
app.use("/api", resultRoutes);
app.use("/api", submitRoutes);
app.use("/api", snapshotRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/demo", demoSetupRoutes);
app.use("/api/demo-admin", demoAdminRoutes);
app.use("/api/demo-auth", demoAuthRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/demo-candidates", demoCandidateRoutes);
app.use("/api/demo-exam/auth", demoExamAuthRoutes);
app.use("/api/demo-exam/questions", demoExamQuestionRoutes);
app.use("/api/demo-exam/results", demoExamResultRoutes);
app.use("/api/demo-snapshots", demoSnapshotRoutes);

app.use("/api/courses", CourseAPIRoute);
app.use("/api/subjects", SubjectAPIRoute);
app.use("/api/questions", questionAPIRoute);

app.use("/api/results", ResultAPIRoute);

// ⭐ DB Dump (optional)
// app.use("/api/superadmin", dbDumpRoutes, verifyToken);

// ===============================================
// 🟢 MongoDB Connect + Auto Super Admin Seed
// ===============================================
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("✅ MongoDB connected");

    const existingSA = await User.findOne({ role: "superadmin" });
    if (!existingSA) {
      const email = "super@sstpl.com";
      const password = "Super@123";
      const hashed = await bcrypt.hash(password, 10);

      await User.create({
        name: "SSTPL Super Admin",
        email: email.toLowerCase(),
        password: hashed,
        role: "superadmin",
        verified: true,
        status: "active",
      });

      console.log(`🔐 Seeded Super Admin: ${email} (password: ${password})`);
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================================
// 🚀 Start Server
// ===============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
