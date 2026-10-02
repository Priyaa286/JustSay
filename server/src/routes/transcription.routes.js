const express = require('express');
const upload = require('../config/upload');
const transcriptionController = require('../controllers/transcription.controller');
const multer = require('multer');

const router = express.Router();

// Middleware wrapper to catch Multer limits (e.g. 25MB file size limit)
const handleUpload = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const limitErr = new Error('Audio file size exceeds maximum limit of 25 MB.');
          limitErr.statusCode = 400;
          return next(limitErr);
        }
        const error = new Error(`File upload error: ${err.message}`);
        error.statusCode = 400;
        return next(error);
      }
      return next(err);
    }
    next();
  });
};

router.post('/', handleUpload, transcriptionController.transcribe);

module.exports = router;
