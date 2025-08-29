// Audio Recording Variables
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = null;
let currentAudioBlob = null;

// Audio Control Functions
function showAudioControls() {
  const audioControls = document.getElementById('audioControls');
  if (audioControls) {
    audioControls.classList.remove('hidden');
  }
}

function hideAudioControls() {
  const audioControls = document.getElementById('audioControls');
  if (audioControls) {
    audioControls.classList.add('hidden');
  }
}

// Toggle Recording
async function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start Recording
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      currentAudioBlob = audioBlob;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioPlayer = document.getElementById('audioPlayer');
      audioPlayer.src = audioUrl;
      audioPlayer.classList.remove('hidden');
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    updateRecordingUI(true);
    startTimer();
    
  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Could not access microphone. Please check permissions.');
  }
}

// Stop Recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    updateRecordingUI(false);
    stopTimer();
    
    // Show the audio controls after recording stops
    setTimeout(() => {
      showAudioControls();
    }, 500);
  }
}

// Update Recording UI
function updateRecordingUI(isRecording) {
  const recordBtn = document.getElementById('recordBtn');
  const recordIcon = document.getElementById('recordIcon');
  const recordText = document.getElementById('recordText');
  const recordingStatus = document.getElementById('recordingStatus');
  
  if (isRecording) {
    recordBtn.className = 'bg-gray-500 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition-all flex items-center gap-2';
    recordIcon.textContent = '⏹️';
    recordText.textContent = 'Stop Recording';
    recordingStatus.classList.remove('hidden');
    hideAudioControls(); // Hide controls while recording
  } else {
    recordBtn.className = 'bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-all flex items-center gap-2';
    recordIcon.textContent = '🔴';
    recordText.textContent = 'Start Recording';
    recordingStatus.classList.add('hidden');
  }
}

// Timer Functions
function startTimer() {
  recordingStartTime = Date.now();
  recordingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recordingTimer').textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

// Play Recording
function playRecording() {
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.play();
}

// Handle Audio Upload
function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (file) {
    currentAudioBlob = file;
    const audioUrl = URL.createObjectURL(file);
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = audioUrl;
    audioPlayer.classList.remove('hidden');
    
    // Show audio controls for uploaded file
    showAudioControls();
    
    // Clear the file input for next upload
    event.target.value = '';
  }
}

// AI Processing Functions
async function processAudioWithAI() {
  if (!currentAudioBlob) {
    alert('No audio recording found. Please record or upload audio first.');
    return;
  }

  showProcessingStatus('Transcribing audio...');

  try {
    // Create FormData for audio upload
    const formData = new FormData();
    formData.append('audio', currentAudioBlob, 'recording.webm');
    formData.append('appointmentId', appointmentId);

    // Send to backend for AI processing
    const response = await fetch('/api/process-audio', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to process audio');
    }

    const result = await response.json();
    hideProcessingStatus();
    displayAIResults(result);

  } catch (error) {
    console.error('Error processing audio:', error);
    hideProcessingStatus();
    alert('Error processing audio: ' + error.message);
  }
}

// Processing Status Functions
function showProcessingStatus(message) {
  document.getElementById('processingText').textContent = message;
  document.getElementById('processingStatus').classList.remove('hidden');
}

function hideProcessingStatus() {
  document.getElementById('processingStatus').classList.add('hidden');
}