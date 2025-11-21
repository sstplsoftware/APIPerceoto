const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const FeedbackUser = require("../models/FeedbackUserModel");

// 🔐 Helper: JWT token generator
const generateToken = (payload, expiresIn = "1h") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// 📧 Nodemailer transporter with TLS + debug
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// Check SMTP connection at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail server connection failed:", error.message);
  } else {
    console.log("✅ Mail server ready to send emails.");
  }
});

// =====================================================
// 1️⃣ Register + Send Verification Mail
// =====================================================
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existing = await FeedbackUser.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await FeedbackUser.create({
      name,
      email,
      phone,
      password: hashed,
      isVerified: false,
    });

    const token = generateToken({ id: user._id }, "1d");
    const verifyLink = `${process.env.CLIENT_URL}/feedback-verify/${token}`;

    // Compose HTML email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your PercePto Account",
      text: `Hello ${name}, please verify your PercePto account by visiting this link: ${verifyLink}`,
    html: `
  <div style="font-family:'Poppins',Arial,sans-serif;background:#f2f5fb;padding:0;margin:0;">
    <div style="max-width:620px;margin:40px auto;background:#ffffff;border-radius:14px;
                overflow:hidden;box-shadow:0 8px 25px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:30px;text-align:center;">
        <img src="https://www.sstpltech.com/logo.png" alt="SSTPL Logo"
             style="height:60px;object-fit:contain;margin-bottom:8px;" />
        <h1 style="color:#fff;font-size:24px;margin:10px 0 0;font-weight:600;letter-spacing:0.5px;">
          Feedback Portal Verification
        </h1>
      </div>

      <!-- Body -->
      <div style="padding:35px 40px 25px;color:#333;text-align:left;">
        <h2 style="font-size:22px;font-weight:600;margin-bottom:12px;color:#111;">Hello ${name}, 👋</h2>

        <p style="font-size:16px;line-height:1.6;margin-bottom:20px;">
          Welcome to <b>Sai Skill Technology Pvt. Ltd.</b><br/>
          To ensure your account’s security, please verify your email address within
          <span style="color:#2563eb;font-weight:600;">10 minutes</span>.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyLink}"
             style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);
                    color:#fff;padding:14px 34px;border-radius:8px;text-decoration:none;
                    font-size:16px;font-weight:500;letter-spacing:0.3px;
                    box-shadow:0 4px 10px rgba(37,99,235,0.3);">
            Verify My Email
          </a>
        </div>

        <p style="font-size:15px;line-height:1.6;color:#444;">
          This verification link will expire soon for your protection.<br/>
          If you didn’t initiate this registration, please ignore this email safely.
        </p>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:#e5e7eb;margin:0 40px;"></div>

      <!-- Footer -->
      <div style="padding:20px 40px;text-align:center;background:#f9fafc;color:#666;font-size:13px;">
        <p style="margin:0 0 5px;">© ${new Date().getFullYear()} <b>Sai Skill Technology Pvt. Ltd.</b></p>
        <p style="margin:0;">Office No.44, 4th Floor, Deepak Building, Nehru Place, New Delhi, INDIA</p>
        <p style="margin-top:6px;">
          <a href="https://www.sstpltech.com" 
             style="color:#2563eb;text-decoration:none;font-weight:500;">www.sstpltech.com</a>
        </p>
      </div>
    </div>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📩 Verification email sent to: ${email}`);

    res.json({
      success: true,
      message:
        "Account created successfully. A verification link has been sent to your email.",
    });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

// =====================================================
// 2️⃣ Verify Email Link
// =====================================================
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await FeedbackUser.findByIdAndUpdate(decoded.id, { isVerified: true });

    res.send(`
      <h2 style="color:#16a34a;font-family:Poppins,sans-serif">✅ Email Verified Successfully</h2>
      <p>You can now <a href='${process.env.CLIENT_URL}/feedback-login'>login here</a>.</p>
    `);
  } catch (err) {
    console.error("❌ Verify link error:", err.message);
    res.status(400).send("<h2>Invalid or expired verification link ❌</h2>");
  }
};

// =====================================================
// 3️⃣ Login (only verified users)
// =====================================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await FeedbackUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.isVerified)
      return res.status(403).json({ error: "Please verify your email first" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    const token = generateToken({ id: user._id }, "7d");
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: err.message });
  }
};

// =====================================================
// 4️⃣ Forgot + Reset Password
// =====================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await FeedbackUser.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = generateToken({ id: user._id }, "1h");
    const link = `${process.env.CLIENT_URL}/feedback-reset/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset - Feedback Portal",
      html: `<p>Reset your password by clicking <a href="${link}">here</a> (expires in 1 hour)</p>`,
    });

    console.log(`🔄 Password reset email sent to: ${email}`);
    res.json({ success: true, message: "Reset link sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Failed to send reset link" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashed = await bcrypt.hash(password, 10);
    await FeedbackUser.findByIdAndUpdate(decoded.id, { password: hashed });
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
};

// =====================================================
// Exports
// =====================================================
module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
};
