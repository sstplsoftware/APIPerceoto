const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =========================================================
   ✅ Upload Candidates via Excel
========================================================= */
router.post('/candidates/upload-excel', verifyToken, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { batchNumber, limit } = req.body;
    const limitNum = parseInt(limit);

    if (!batchNumber || isNaN(limitNum))
      return res.status(400).json({ error: 'Batch number and limit are required' });

    if (!req.file)
      return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const inserted = [];
    const skipped = [];

    for (let i = 0; i < limitNum && i < rows.length; i++) {
      const row = rows[i];
      const name = row['Name'] || row['name'];
const email = row['Email'] || row['email'];
const password = row['Password'] || row['password'];

if (!name || !email || !password) {
  skipped.push({ reason: 'Missing name/email/password', row });
  continue;
}
      const serial = String(i + 1).padStart(3, '0');
      const candidateId = `C-${batchNumber.replace('BATCH', 'B')}-${serial}`;

      const exists = await User.findOne({ candidateId, batchNumber, createdBy: req.user.id });
      if (exists) {
        skipped.push({ reason: 'Duplicate candidateId in batch', row });
        continue;
      }

      const hashedPassword = await bcrypt.hash(password.toString(), 10);

      inserted.push({
        name,
        email,
        candidateId,
        password: hashedPassword,
        batchNumber,
        role: 'candidate',
        createdBy: req.user.id,
      });
    }

    if (inserted.length === 0)
      return res.status(400).json({ error: 'No valid candidates to insert', skipped });

    await User.insertMany(inserted);
    res.json({
      message: `${inserted.length} candidates uploaded to ${batchNumber}.`,
      skipped: skipped.length || 0,
    });
  } catch (err) {
    console.error('❌ Upload Error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/* =========================================================
   ✅ Candidate Listing (Own Only)
========================================================= */
router.get('/candidates', verifyToken, isAdmin, async (req, res) => {
  try {
    const candidates = await User.find(
      { role: 'candidate', createdBy: req.user.id },
      'name email candidateId batchNumber'
    );
    res.json(candidates);
  } catch (err) {
    console.error('❌ Candidate Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

/* =========================================================
   ✅ Create Candidate Manually
========================================================= */
router.post('/candidates', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password, batchNumber } = req.body;
    if (!name || !email || !password || !batchNumber)
      return res.status(400).json({ error: 'All fields are required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Candidate with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const candidateId = `C-${batchNumber.replace('BATCH', 'B')}-${Date.now()}`;

    const candidate = await User.create({
      name,
      email,
      password: hashedPassword,
      candidateId,
      batchNumber,
      role: 'candidate',
      createdBy: req.user.id,
    });

    res.status(201).json(candidate);
  } catch (err) {
    console.error('❌ Create Error:', err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

/* =========================================================
   ✅ Update Candidate (Own Only)
========================================================= */
router.put('/candidates/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, batchNumber } = req.body;

    const updated = await User.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { name, email, batchNumber },
      { new: true }
    ).select('-password');

    if (!updated)
      return res.status(404).json({ error: 'Candidate not found or not yours' });

    res.json({ message: 'Candidate updated', candidate: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

/* =========================================================
   ✅ Suspend / Activate Candidate (Own Only)
========================================================= */
router.put('/candidates/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await User.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { status },
      { new: true }
    ).select('-password');

    if (!updated)
      return res.status(404).json({ error: 'Candidate not found or not yours' });

    res.json({ message: 'Status updated', candidate: updated });
  } catch (err) {
    res.status(500).json({ error: 'Status update failed' });
  }
});

/* =========================================================
   ✅ Hard Delete (Own Only)
========================================================= */
router.delete('/candidates/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.findOneAndDelete({ _id: id, createdBy: req.user.id });
    if (!deleted)
      return res.status(404).json({ error: 'Candidate not found or not yours' });

    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
