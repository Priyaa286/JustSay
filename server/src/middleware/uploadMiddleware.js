const multer = require('multer');
const upload = require('../config/upload');

/**
 * Express middleware wrapper to catch Multer file limits or format errors cleanly.
 */
const handleAudioUpload = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const limitErr = new Error('Audio file size exceeds maximum limit of 25 MB.');
          limitErr.statusCode = 400;
          limitErr.errorCode = 'AUDIO_TOO_LARGE';
          limitErr.isPublic = true;
          return next(limitErr);
        }
        const error = new Error(`File upload error: ${err.message}`);
        error.statusCode = 400;
        error.errorCode = 'AUDIO_UPLOAD_FAILED';
        error.isPublic = true;
        return next(error);
      }
      err.errorCode = err.errorCode || 'AUDIO_UPLOAD_FAILED';
      err.isPublic = true;
      return next(err);
    }
    next();
  });
};

module.exports = {
  handleAudioUpload
};
