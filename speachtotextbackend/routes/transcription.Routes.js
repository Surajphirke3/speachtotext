const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadAudio,
  transcribeAudio,
  exportTranscription
} = require('../controllers/transcription.controller');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Status endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Routes
router.post('/upload', upload.single('audio'), uploadAudio);
router.post('/transcribe', transcribeAudio);
router.post('/export', exportTranscription);

module.exports = router;
