const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config(); // Load .env file

// Upload handler
exports.uploadAudio = (req, res) => {
  console.log('Upload request received:', req.file); // Debug log
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Ensure the file is an audio file
  const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path); // Delete the file
    return res.status(400).json({ error: 'Invalid file type. Please upload an audio file.' });
  }

  res.json({
    message: 'File uploaded successfully',
    filePath: req.file.path,
    fileName: req.file.filename
  });
};

// Transcription handler using OpenAI Whisper API
exports.transcribeAudio = async (req, res) => {
  console.log('Transcribe request received:', req.body); // Debug log
  
  const { filePath, language } = req.body;
  
  if (!filePath || !language) {
    return res.status(400).json({ error: 'Missing filePath or language in request body.' });
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found.' });
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', 'whisper-1');
    form.append('language', language);

    console.log('Sending request to OpenAI Whisper API...'); // Debug log
    
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders()
      }
    });

    console.log('Whisper API response:', response.data); // Debug log
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.json({ transcript: response.data.text });
  } catch (error) {
    console.error('Transcription error:', error.response?.data || error.message);
    
    // Clean up the uploaded file in case of error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({ 
      error: 'Failed to transcribe audio using Whisper API.',
      details: error.response?.data || error.message
    });
  }
};

// Export handler (Download transcript as text file)
exports.exportTranscription = (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  const fileName = `transcript-${Date.now()}.txt`;
  const filePath = path.join(__dirname, '..', 'uploads', fileName);

  fs.writeFileSync(filePath, transcript, 'utf8');

  res.download(filePath, fileName, () => {
    fs.unlinkSync(filePath); // Clean up after download
  });
};
