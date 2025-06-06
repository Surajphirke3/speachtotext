const startBtn = document.getElementById('start-recording');
const stopBtn = document.getElementById('stop-recording');
const fileInput = document.getElementById('file-upload');
const languageSelect = document.getElementById('language-select');
const transcribeBtn = document.getElementById('transcribe-btn');
const outputText = document.getElementById('transcription-text');
const copyBtn = document.getElementById('copy-btn');
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const statusMessage = document.getElementById('status-message');
const recordingIndicator = document.getElementById('recording-indicator');
const audioVisualization = document.getElementById('audio-visualization');
const dropZone = document.getElementById('drop-zone');
const fileUploadButton = document.querySelector('.file-upload-button');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioContext;
let analyser;
let dataArray;
let animationFrame;

// Initialize audio visualization bars
function createVisualizationBars() {
  audioVisualization.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.left = `${i * 4}px`;
    bar.style.animationDelay = `${i * 0.1}s`;
    audioVisualization.appendChild(bar);
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message show ${type}`;
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3000);
}

// Check if backend is available
async function checkBackendStatus() {
  try {
    const isAvailable = await window.backendAPI.checkBackendStatus();
    if (!isAvailable) {
      showStatus('Backend server is not available. Please make sure it is running on port 3000.', 'error');
      return false;
    }
    return true;
  } catch (error) {
    showStatus('Error connecting to backend server: ' + error.message, 'error');
    return false;
  }
}

// Start recording
startBtn.addEventListener('click', async () => {
  if (!await checkBackendStatus()) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    // Set up audio visualization
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    function updateVisualization() {
      if (!isRecording) return;
      analyser.getByteFrequencyData(dataArray);
      const bars = audioVisualization.getElementsByClassName('wave-bar');
      for (let i = 0; i < bars.length; i++) {
        const value = dataArray[i] / 255;
        bars[i].style.height = `${value * 40 + 10}px`;
      }
      animationFrame = requestAnimationFrame(updateVisualization);
    }

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      transcribeAudio(audioBlob);
      cancelAnimationFrame(animationFrame);
    };

    mediaRecorder.start();
    isRecording = true;
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    recordingIndicator.classList.add('active');
    audioVisualization.classList.add('active');
    createVisualizationBars();
    updateVisualization();
    
    showStatus('Recording started...', 'info');
  } catch (error) {
    showStatus('Could not access microphone. Please check permissions.', 'error');
  }
});

// Stop recording
stopBtn.addEventListener('click', () => {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    recordingIndicator.classList.remove('active');
    audioVisualization.classList.remove('active');
    
    showStatus('Recording stopped. Processing...', 'success');
  }
});

// File upload handling
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.type.startsWith('audio/')) {
      // Update the button text to show the file name
      fileUploadButton.innerHTML = `📂 ${file.name}`;
      showStatus(`File "${file.name}" selected. Ready to transcribe!`, 'success');
    } else {
      showStatus('Please select a valid audio file (MP3, WAV, M4A).', 'error');
      fileInput.value = '';
      fileUploadButton.innerHTML = '📂 Choose File';
    }
  }
});

// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('audio/')) {
      fileInput.files = files;
      // Update the button text to show the file name
      fileUploadButton.innerHTML = `📂 ${file.name}`;
      showStatus(`File "${file.name}" dropped successfully!`, 'success');
    } else {
      showStatus('Please drop a valid audio file (MP3, WAV, M4A).', 'error');
    }
  }
});

// Transcribe button
transcribeBtn.addEventListener('click', async () => {
  if (!await checkBackendStatus()) return;

  const file = fileInput.files[0];
  if (file) {
    transcribeAudio(file);
  } else if (audioChunks.length > 0) {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    transcribeAudio(audioBlob);
  } else {
    showStatus('Please record audio or upload a file first.', 'error');
  }
});

async function transcribeAudio(audioBlob) {
  try {
    showStatus('Uploading audio...', 'info');
    const language = languageSelect.value;
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('lang', language);

    // First upload the audio file
    const uploadResponse = await fetch('http://localhost:3000/api/transcription/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.error || 'Failed to upload audio file');
    }
    
    const uploadData = await uploadResponse.json();
    showStatus('Audio uploaded. Transcribing...', 'info');
    
    // Then transcribe the uploaded file
    const transcribeResponse = await fetch('http://localhost:3000/api/transcription/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath: uploadData.filePath,
        language: language
      })
    });
    
    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json();
      throw new Error(errorData.error || 'Failed to transcribe audio');
    }
    
    const transcriptionData = await transcribeResponse.json();
    outputText.value = transcriptionData.transcript;
    showStatus('Transcription completed!', 'success');
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  if (outputText.value) {
    try {
      await navigator.clipboard.writeText(outputText.value);
      showStatus('Text copied to clipboard!', 'success');
    } catch (error) {
      showStatus('Failed to copy text: ' + error.message, 'error');
    }
  } else {
    showStatus('No text to copy', 'error');
  }
});

// Save as file
saveBtn.addEventListener('click', async () => {
  if (outputText.value) {
    try {
      const result = await window.electronAPI.saveText(outputText.value);
      if (result.success) {
        showStatus('Text saved successfully!', 'success');
      } else {
        showStatus('Failed to save text: ' + result.error, 'error');
      }
    } catch (error) {
      showStatus('Failed to save text: ' + error.message, 'error');
    }
  } else {
    showStatus('No text to save', 'error');
  }
});

// Clear text
clearBtn.addEventListener('click', () => {
  outputText.value = '';
  // Also clear the file input and reset the button text
  fileInput.value = '';
  fileUploadButton.innerHTML = '📂 Choose File';
  showStatus('Text cleared', 'info');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  showStatus('Ready to transcribe audio! Start by recording or uploading a file.', 'info');
  checkBackendStatus();
});

