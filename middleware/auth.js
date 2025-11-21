// ===============================================
// 🧩 AUTH MIDDLEWARE (Improved with expiry + demo support)
// ===============================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DemoCandidate = require("../models/DemoCandidate.model");


exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Try main User first (superadmin/admin/demoadmin/etc.)
    let user = await User.findById(decoded.id).select("-password");

    // Then fallback to demo candidate
    if (!user) {
      user = await DemoCandidate.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: "Account not found or has been deleted" });
    }

    // normalize id field so controllers can safely use req.user.id
    if (!user.id) {
      user.id = user._id;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }
    res.status(401).json({ error: "Unauthorized or invalid token" });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};

exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "superadmin") {
    return res
      .status(403)
      .json({ error: "Access Denied: Super Admins only" });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied: Admins only" });
  }
  next();
};
