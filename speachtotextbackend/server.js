const express = require('express');
const cors = require('cors');
const multer = require('multer');
const transcriptionRoutes = require('./routes/transcription.Routes');

const app = express();
app.use(cors());
app.use(express.json());

// Static folder for uploaded files
// app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/transcription', transcriptionRoutes);

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
