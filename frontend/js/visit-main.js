// Global Variables
let analysisSync;
let currentAppointment = null;
let recordingCount = 0;
let allAnalyses = []; // Store all AI analyses

// Get appointment ID from URL
const urlParams = new URLSearchParams(window.location.search);
const appointmentId = urlParams.get('id');

if (!appointmentId) {
  showError("No appointment ID provided");
}

// Authentication Check
async function checkAuth() {
  try {
    const res = await fetch('/api/me', {
      credentials: 'include'
    });
    if (!res.ok) {
      window.location.href = '/login.html';
    }
  } catch (error) {
    window.location.href = '/login.html';
  }
}

// Load Appointment Details
async function loadAppointmentDetails() {
  try {
    const response = await fetch(`/api/appointments`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    const appointments = await response.json();
    currentAppointment = appointments.find(app => app._id === appointmentId);

    if (!currentAppointment) {
      throw new Error('Appointment not found');
    }

    displayAppointmentDetails();
    loadMedicalProfile();
    
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('appointmentContent').style.display = 'block';

  } catch (err) {
    console.error('Error loading appointment:', err);
    showError("Failed to load appointment details");
  }
}

// Display Appointment Details
function displayAppointmentDetails() {
  const dateObj = new Date(currentAppointment.date);
  const dateStr = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const detailsContainer = document.getElementById('appointmentDetails');
  detailsContainer.innerHTML = `
    <div class="space-y-3">
      <div>
        <span class="font-semibold text-gray-700">Doctor:</span>
        <p class="text-lg">Dr. ${currentAppointment.doctor}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">Date & Time:</span>
        <p class="text-lg">${dateStr}</p>
        <p class="text-gray-600">${timeStr}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">Reason for Visit:</span>
        <p class="text-gray-800">${currentAppointment.reason || 'Not specified'}</p>
      </div>
    </div>
    <div class="space-y-3">
      <div>
        <span class="font-semibold text-gray-700">Goal for Visit:</span>
        <p class="text-gray-800">${currentAppointment.goal || 'Not specified'}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">Symptoms:</span>
        <p class="text-gray-800">${currentAppointment.symptoms || 'None listed'}</p>
      </div>
      <div>
        <span class="font-semibold text-gray-700">Created:</span>
        <p class="text-gray-600 text-sm">${new Date(currentAppointment.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  `;
}

// Load Medical Profile
async function loadMedicalProfile() {
  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });

    if (response.ok) {
      const profile = await response.json();
      displayProfileSummary(profile);
    }
  } catch (err) {
    console.error('Error loading medical profile:', err);
    document.getElementById('profileSummary').innerHTML = `
      <p class="text-gray-500 col-span-2">Unable to load medical profile</p>
    `;
  }
}

// Display Profile Summary
function displayProfileSummary(profile) {
  const summary = document.getElementById('profileSummary');
  
  if (!profile || Object.keys(profile).length <= 2) {
    summary.innerHTML = `
      <p class="text-gray-500 col-span-2">
        No medical profile found. 
        <a href="/profile.html" class="text-blue-500 hover:text-blue-600">Create your profile →</a>
      </p>
    `;
    return;
  }

  const height = profile.height || (profile.heightWeight ? profile.heightWeight.split(',')[0]?.trim() : '');
  const weight = profile.weight || (profile.heightWeight ? profile.heightWeight.split(',')[1]?.trim() : '');
  const emergencyName = profile.emergencyContactName || (profile.emergencyContact ? profile.emergencyContact.split(' - ')[0] : '');
  const emergencyPhone = profile.emergencyContactPhone || (profile.emergencyContact ? profile.emergencyContact.split(' - ')[1] : '');

  summary.innerHTML = `
    <div class="space-y-2">
      ${profile.name ? `<div><strong>Name:</strong> ${profile.name}</div>` : ''}
      ${profile.bloodType ? `<div><strong>Blood Type:</strong> ${profile.bloodType}</div>` : ''}
      ${height ? `<div><strong>Height:</strong> ${height}</div>` : ''}
      ${weight ? `<div><strong>Weight:</strong> ${weight}</div>` : ''}
      ${profile.allergies ? `<div><strong>Allergies:</strong> ${profile.allergies}</div>` : ''}
      ${profile.conditions ? `<div><strong>Conditions:</strong> ${profile.conditions}</div>` : ''}
    </div>
    <div class="space-y-2">
      ${profile.medications ? `<div><strong>Medications:</strong> ${profile.medications}</div>` : ''}
      ${emergencyName ? `<div><strong>Emergency Contact:</strong> ${emergencyName}</div>` : ''}
      ${emergencyPhone ? `<div><strong>Emergency Phone:</strong> ${emergencyPhone}</div>` : ''}
      ${profile.insurance ? `<div><strong>Insurance:</strong> ${profile.insurance}</div>` : ''}
    </div>
  `;
}

// AI Results Functions
async function displayAIResults(result) {
  recordingCount++;
  
  console.log('📝 displayAIResults called');
  console.log('🔄 analysisSync exists:', !!analysisSync);

  // Add this analysis to our collection
  const analysisData = {
    id: recordingCount,
    timestamp: new Date().toISOString(),
    transcript: result.transcript,
    summary: result.summary,
    keyPoints: result.keyPoints || [],
    questions: result.questions || [],
    actionItems: result.actionItems || []
  };
  
  console.log('💾 About to call saveAnalysis');
        
  try {
    const saveResult = await analysisSync.saveAnalysis(analysisData);
    console.log('✅ saveAnalysis completed:', saveResult);
    
    // Show sync status
    if (saveResult.synced) {
      showSaveConfirmation('Analysis saved and synced to all devices');
    } else {
      showSaveConfirmation('Analysis saved locally - will sync when online');
    }
  } catch (error) {
    console.error('❌ saveAnalysis failed:', error);
    showSaveConfirmation('Analysis saved locally only');
  }

  allAnalyses.push(analysisData);
  
  // Create HTML for this specific analysis
  const analysisElement = document.createElement('div');
  analysisElement.className = 'border rounded-lg p-4 bg-gray-50';
  analysisElement.id = `analysis-${recordingCount}`;
  
  // Add sync status indicator
  const syncStatus = analysisData.synced !== false ? 
    '<span class="text-green-600 text-xs">☁️ Synced</span>' : 
    '<span class="text-orange-600 text-xs">📱 Local only</span>';
  
  analysisElement.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800">Recording ${recordingCount}</h3>
      <div class="flex items-center gap-2">
        ${syncStatus}
        <span class="text-sm text-gray-500">${new Date(analysisData.timestamp).toLocaleString()}</span>
        <button onclick="removeAnalysis(${recordingCount})" class="text-red-500 hover:text-red-600 text-sm">Remove</button>
      </div>
    </div>
    
    <!-- Transcript -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">🎤 Transcript</h4>
      <div class="bg-white p-3 rounded border text-sm max-h-32 overflow-y-auto">
        <p class="whitespace-pre-wrap">${result.transcript}</p>
      </div>
    </div>

    <!-- Summary -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">📋 Summary</h4>
      <div class="bg-blue-50 p-3 rounded border text-sm">
        <div class="space-y-1">
          ${result.summary.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
        </div>
      </div>
    </div>

    <!-- Key Points -->
    ${result.keyPoints && result.keyPoints.length > 0 ? `
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">🔍 Key Points</h4>
      <div class="bg-purple-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${result.keyPoints.map(point => `<li class="flex items-start gap-2"><span class="text-purple-600">•</span><span>${point}</span></li>`).join('')}
        </ul>
      </div>
    </div>` : ''}

    <!-- Suggested Questions -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">❓ Suggested Follow-up Questions</h4>
      <div class="bg-green-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${result.questions.map(q => `<li class="flex items-start gap-2"><span class="text-green-600">•</span><span>${q}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Action Items -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">✅ Action Items & Next Steps</h4>
      <div class="bg-yellow-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${result.actionItems.map(item => `<li class="flex items-start gap-2"><span class="text-yellow-600">•</span><span>${item}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  
  // Add to container
  const container = document.getElementById('aiAnalysisContainer');
  container.appendChild(analysisElement);
  
  // Show the AI section and update count
  const aiSection = document.getElementById('aiAnalysisSection');
  aiSection.classList.remove('hidden');
  updateAnalysisCount();
  
  // Scroll to the new analysis
  analysisElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateAnalysisCount() {
  const countElement = document.getElementById('analysisCount');
  countElement.textContent = `${allAnalyses.length} recording${allAnalyses.length !== 1 ? 's' : ''}`;
}

async function loadAnalysesFromStorage() {
  try {
    console.log('📥 Loading analyses with cross-device sync...');
    
    // Load with improved sync logic
    const analyses = await analysisSync.loadAnalyses();
    
    if (analyses.length > 0) {
      allAnalyses = analyses;
      recordingCount = Math.max(...analyses.map(a => a.id), 0);
      
      // Display all analyses
      analyses.forEach(analysis => {
        displayStoredAnalysis(analysis);
      });
      
      // Show section
      document.getElementById('aiAnalysisSection').classList.remove('hidden');
      updateAnalysisCount();
      
      console.log(`✅ Loaded ${analyses.length} analyses with cross-device sync`);
      
      // Show sync status
      const status = await analysisSync.getStatus();
      if (status.unsyncedCount > 0) {
        showSaveConfirmation(`${status.unsyncedCount} analyses pending sync`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading analyses:', error);
  }
}

function displayStoredAnalysis(analysisData) {
  const analysisElement = document.createElement('div');
  analysisElement.className = 'border rounded-lg p-4 bg-gray-50';
  analysisElement.id = `analysis-${analysisData.id}`;
  
  analysisElement.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800">Recording ${analysisData.id}</h3>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">${new Date(analysisData.timestamp).toLocaleString()}</span>
        <button onclick="removeAnalysis(${analysisData.id})" class="text-red-500 hover:text-red-600 text-sm">Remove</button>
      </div>
    </div>
    
    <!-- Transcript -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">🎤 Transcript</h4>
      <div class="bg-white p-3 rounded border text-sm max-h-32 overflow-y-auto">
        <p class="whitespace-pre-wrap">${analysisData.transcript}</p>
      </div>
    </div>

    <!-- Summary -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">📋 Summary</h4>
      <div class="bg-blue-50 p-3 rounded border text-sm">
        <div class="space-y-1">
          ${analysisData.summary.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
        </div>
      </div>
    </div>

    <!-- Key Points -->
    ${analysisData.keyPoints && analysisData.keyPoints.length > 0 ? `
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">🔍 Key Points</h4>
      <div class="bg-purple-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${analysisData.keyPoints.map(point => `<li class="flex items-start gap-2"><span class="text-purple-600">•</span><span>${point}</span></li>`).join('')}
        </ul>
      </div>
    </div>` : ''}

    <!-- Suggested Questions -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">❓ Suggested Follow-up Questions</h4>
      <div class="bg-green-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${analysisData.questions.map(q => `<li class="flex items-start gap-2"><span class="text-green-600">•</span><span>${q}</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Action Items -->
    <div class="mb-4">
      <h4 class="font-medium mb-2 text-gray-700">✅ Action Items & Next Steps</h4>
      <div class="bg-yellow-50 p-3 rounded border text-sm">
        <ul class="space-y-1">
          ${analysisData.actionItems.map(item => `<li class="flex items-start gap-2"><span class="text-yellow-600">•</span><span>${item}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  
  const container = document.getElementById('aiAnalysisContainer');
  container.appendChild(analysisElement);
}

// Analysis Management Functions
async function removeAnalysis(analysisId) {
  if (!confirm('Remove this analysis? This will delete it from all your devices.')) {
    return;
  }

  try {
    // Remove from server and localStorage with proper sync
    await analysisSync.deleteAnalysis(analysisId);
    
    // Remove from local array
    allAnalyses = allAnalyses.filter(a => a.id !== analysisId);
    
    // Remove from UI
    const element = document.getElementById(`analysis-${analysisId}`);
    if (element) {
      element.remove();
    }
    
    // Update UI
    updateAnalysisCount();
    if (allAnalyses.length === 0) {
      document.getElementById('aiAnalysisSection').classList.add('hidden');
    }
    
    showSaveConfirmation('Analysis deleted from all devices');
  } catch (error) {
    console.error('❌ Error removing analysis:', error);
    showSaveConfirmation('Error deleting analysis');
  }
}

async function clearAllAnalysis() {
  if (confirm('Clear all AI analysis results? This will remove them from all your devices and cannot be undone.')) {
    try {
      await analysisSync.clearAllAnalyses();
      
      allAnalyses = [];
      recordingCount = 0;
      document.getElementById('aiAnalysisContainer').innerHTML = '';
      document.getElementById('aiAnalysisSection').classList.add('hidden');
      
      showSaveConfirmation('All analyses cleared from all devices');
    } catch (error) {
      console.error('❌ Error clearing analyses:', error);
      showSaveConfirmation('Error clearing analyses');
    }
  }
}

// Utility Functions
function showSaveConfirmation(message = '✓ Analysis saved automatically') {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 max-w-xs text-sm';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

function showError(message) {
  document.getElementById('loadingMessage').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('errorMessage').querySelector('.text-red-500').textContent = message;
}

// Appointment Management Functions
function editAppointment() {
  const dateObj = new Date(currentAppointment.date);
  
  document.getElementById('editDoctor').value = currentAppointment.doctor;
  document.getElementById('editDate').value = dateObj.toISOString().split('T')[0];
  document.getElementById('editTime').value = dateObj.toTimeString().split(' ')[0].substring(0, 5);
  document.getElementById('editReason').value = currentAppointment.reason || '';
  document.getElementById('editGoal').value = currentAppointment.goal || '';
  document.getElementById('editSymptoms').value = currentAppointment.symptoms || '';
  
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

async function deleteCurrentAppointment() {
  if (!confirm("Are you sure you want to delete this appointment?")) return;

  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (response.ok) {
      alert('Appointment deleted successfully');
      window.location.href = '/';
    } else {
      alert('Failed to delete appointment');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Error deleting appointment');
  }
}

// Visit Notes Functions
function saveVisitNotes() {
  const manualNotes = document.getElementById('manualNotes').value;
  const prescriptions = document.getElementById('prescriptions').value;
  const followUp = document.getElementById('followUp').value;

  const notesKey = `visit_notes_${appointmentId}`;
  const notes = {
    manualNotes,
    prescriptions,
    followUp,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(notesKey, JSON.stringify(notes));
  alert('Visit notes saved successfully!');
}

function loadVisitNotes() {
  const notesKey = `visit_notes_${appointmentId}`;
  const savedNotes = localStorage.getItem(notesKey);
  
  if (savedNotes) {
    try {
      const notes = JSON.parse(savedNotes);
      document.getElementById('manualNotes').value = notes.manualNotes || '';
      document.getElementById('prescriptions').value = notes.prescriptions || '';
      document.getElementById('followUp').value = notes.followUp || '';
    } catch (err) {
      console.error('Error loading saved notes:', err);
    }
  }
}

async function logout() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  window.location.href = '/login.html';
}

// Event Listeners
document.getElementById('editAppointmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const doctor = document.getElementById('editDoctor').value;
  const date = document.getElementById('editDate').value;
  const time = document.getElementById('editTime').value;
  const reason = document.getElementById('editReason').value;
  const goal = document.getElementById('editGoal').value;
  const symptoms = document.getElementById('editSymptoms').value;

  const fullDateTime = new Date(`${date}T${time}`);

  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ doctor, date: fullDateTime, reason, goal, symptoms })
    });

    if (response.ok) {
      closeEditModal();
      window.location.reload();
    } else {
      alert('Failed to update appointment');
    }
  } catch (err) {
    console.error('Update error:', err);
    alert('Error updating appointment');
  }
});

// Initialize Page
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🔄 DOMContentLoaded - appointmentId:', appointmentId);
  checkAuth();
  loadAppointmentDetails();
  loadVisitNotes();
  
  // Initialize analysis sync with improved version
  console.log('🔄 Creating enhanced SimpleAnalysisSync...');
  analysisSync = new SimpleAnalysisSync(appointmentId);
  console.log('✅ analysisSync created:', !!analysisSync);
  
  // Load existing analyses with cross-device sync
  await loadAnalysesFromStorage();
  
  console.log('✅ Visit page initialized with enhanced cross-device sync');
});