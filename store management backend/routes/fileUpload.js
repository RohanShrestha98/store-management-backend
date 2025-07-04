const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save to "uploads" directory
  },
  filename: function (req, file, cb) {
    const safeFilename = file.originalname.replace(/\s+/g, "_");
    cb(null, safeFilename);
  },
});

const upload = multer({ storage: storage });

router.post("/api/upload", upload.array("files", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    const fileInfos = req.files.map((file) => ({
      filename: file.filename,
      path: file.path,
      size: file.size,
      url: `http://localhost:3001/uploads/${encodeURIComponent(file.filename)}`,
    }));

    res.json({
      message: "Files uploaded successfully!",
      files: fileInfos,
    });
  } catch (err) {
    res.status(500).send("Error uploading files");
  }
});

module.exports = router;
