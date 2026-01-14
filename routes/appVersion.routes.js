const express = require("express");
const router = express.Router();

/*
  🔐 App Version Control
  - version: semantic version
  - build: android versionCode
  - force: cannot skip update
*/
router.get("/version", (_req, res) => {
  res.json({
    appName: "Percepto",
    platform: "android",
    version: "1.0.7",
    build: 14,
    force: true,
    apkUrl: "https://percepto.sstpltech.com/apk/percepto-latest.apk",
    changelog: [
      "Improved proctoring stability",
      "Fixed camera freeze detection",
      "Security hardening",
    ],
  });
});

module.exports = router;
