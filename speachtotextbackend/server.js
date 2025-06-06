const express = require('express');
const cors = require('cors');
const multer = require('multer');
const transcriptionRoutes = require('./routes/transcription.Routes');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure CORS with specific options
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Static folder for uploaded files
// app.use('/uploads', express.static('uploads'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('audio-chunk', async (data) => {
    try {
      const { audioData, language } = data;
      // Process the audio chunk and send back transcription
      const transcription = await processAudioChunk(audioData, language);
      socket.emit('transcription-result', {
        transcript: transcription,
        isPartial: true
      });
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      socket.emit('transcription-error', {
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/transcription', transcriptionRoutes);

// Server start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export io instance for use in other files
module.exports = { io };
