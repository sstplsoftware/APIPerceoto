// routes/excelUpload.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =========================================================
   ✅ Upload Candidates from Excel (Admin Only)
========================================================= */
router.post(
  '/upload-excel',
  verifyToken,
  isAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const { batchNumber } = req.body;

      if (!batchNumber)
        return res.status(400).json({ error: 'Batch number is required' });

      if (!req.file)
        return res.status(400).json({ error: 'No Excel file uploaded' });

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (!rows.length)
        return res.status(400).json({ error: 'Excel sheet is empty' });

      const inserted = [];
      const skipped = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row['Name'] || row['name'];
        const email = row['Email'] || row['email'];
        const password = row['Password'] || row['password'];

        if (!name || !email || !password) {
          skipped.push({ row: i + 1, reason: 'Missing name/email/password' });
          continue;
        }

        const existing = await User.findOne({ email, batchNumber, createdBy: req.user.id });
        if (existing) {
          skipped.push({ row: i + 1, reason: 'Duplicate email in batch' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password.toString(), 10);

        inserted.push({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          batchNumber,
          candidateId: `C-${batchNumber.replace('BATCH', 'B')}-${String(i + 1).padStart(3, '0')}`,
          role: 'candidate',
          createdBy: req.user.id,
        });
      }

      if (!inserted.length)
        return res.status(400).json({ error: 'No valid candidates to insert', skipped });

      await User.insertMany(inserted);

      res.status(200).json({
        message: `${inserted.length} candidates added to ${batchNumber}.`,
        insertedCount: inserted.length,
        skippedCount: skipped.length,
        skipped,
      });
    } catch (err) {
      console.error('❌ Excel Upload Error:', err);
      res.status(500).json({ error: 'Upload failed', details: err.message });
    }
  }
);

module.exports = router;
