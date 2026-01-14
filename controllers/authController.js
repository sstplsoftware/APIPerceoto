// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: sign JWT
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, issuedAt: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

// ✅ Register user (supports admin/demoadmin/candidate)
const register = async (req, res) => {
  try {
    let { name, email, password, role, candidateId, batchNumber } = req.body;
    email = (email || '').toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const allowedRoles = ['admin', 'demoadmin', 'candidate'];
    if (!role || !allowedRoles.includes(role)) role = 'candidate';

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPass = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPass,
      role,
      verified: role !== 'candidate',
      createdBy: req.user?._id || null, // ✅ Track who created this user
    };

    if (role === 'candidate') {
      if (!candidateId || !batchNumber) {
        return res.status(400).json({ error: 'Candidate ID and Batch Number are required' });
      }
      userData.candidateId = candidateId;
      userData.batchNumber = batchNumber;
    }

    if (role === 'demoadmin') {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      userData.expiresAt = new Date(Date.now() + thirtyDays);
      userData.candidateLimit = 0; // ✅ No enforced limits
      userData.candidatesCreated = 0;
    }

    const user = new User(userData);
    await user.save();

    return res.status(201).json({ message: '✅ User created successfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate candidateId or email already exists.' });
    }
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Login user (blocks expired Demo Admins)
const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || '').toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: '❌ User not found' });

    if (user.role === 'demoadmin' && user.expiresAt && user.expiresAt.getTime() <= Date.now()) {
      user.status = 'expired';
      await user.save();
      return res.status(403).json({ error: 'Demo Admin expired. Please request an extension.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: '❌ Invalid credentials' });

    const token = signToken(user);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      status: user.status,
    };

    if (user.role === 'candidate') {
      userData.batchNumber = user.batchNumber;
      userData.candidateId = user.candidateId;
    }

    return res.json({ token, user: userData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ✅ Reset password
const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword)
      return res.status(400).json({ error: 'userId and newPassword required' });

    const hashedPass = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPass });

    return res.json({ message: '✅ Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, resetPassword };
