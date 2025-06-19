const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for file uploads with proper naming
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File received:', file.originalname, 'Type:', file.mimetype);
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Middleware to check auth token
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Helper function to get proper file extension
function getProperExtension(mimetype, originalname) {
  if (mimetype.includes('webm')) return '.webm';
  if (mimetype.includes('mp4')) return '.mp4';
  if (mimetype.includes('mpeg')) return '.mp3';
  if (mimetype.includes('wav')) return '.wav';
  if (mimetype.includes('m4a')) return '.m4a';
  if (mimetype.includes('ogg')) return '.ogg';
  
  // Fallback to original extension if available
  if (originalname && originalname.includes('.')) {
    return path.extname(originalname);
  }
  
  return '.webm'; // Default for browser recordings
}

// POST - Process audio recording with OpenAI
router.post('/process-audio', authenticateToken, upload.single('audio'), async (req, res) => {
  let tempFilePath = null;
  let renamedFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const appointmentId = req.body.appointmentId;
    tempFilePath = req.file.path;
    
    console.log('🎙️ Processing audio file:', req.file.originalname || 'browser-recording');
    console.log('📁 Original file type:', req.file.mimetype);
    console.log('📁 Temp file path:', tempFilePath);

    // Rename file with proper extension for OpenAI
    const properExtension = getProperExtension(req.file.mimetype, req.file.originalname);
    renamedFilePath = tempFilePath + properExtension;
    
    // Copy file with proper extension
    fs.copyFileSync(tempFilePath, renamedFilePath);
    console.log('📁 Renamed file path:', renamedFilePath);

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log('🔄 Starting transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(renamedFilePath),
      model: 'whisper-1',
      language: 'en', // You can make this dynamic
      response_format: 'text'
    });

    console.log('✅ Transcription completed');
    console.log('📝 Transcript length:', transcription.length, 'characters');

    // Step 2: Analyze transcript with GPT for medical insights
    console.log('🔄 Analyzing transcript...');
    const analysisPrompt = `
You are a medical AI assistant helping patients understand their doctor visits. 
Analyze this medical visit transcript and provide:

1. A clear, concise summary of what happened during the visit
2. Key medical information discussed (diagnoses, treatments, medications)
3. 5-7 thoughtful follow-up questions the patient should consider asking their doctor
4. Action items and next steps the patient should take

Make the language patient-friendly and easy to understand. Be thorough but concise.

TRANSCRIPT:
${transcription}

Please format your response as JSON with the following structure:
{
  "summary": "Clear summary of the visit...",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "questions": ["Question 1?", "Question 2?", ...],
  "actionItems": ["Action 1", "Action 2", ...]
}
`;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful medical AI assistant. Always provide accurate, helpful information in a patient-friendly format. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysis.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback structure if JSON parsing fails
      analysisResult = {
        summary: analysis.choices[0].message.content,
        keyPoints: ['Analysis completed - see summary for details'],
        questions: ['What questions do you have about your visit?'],
        actionItems: ['Review visit notes with your healthcare provider']
      };
    }

    console.log('✅ Analysis completed');

    // Clean up temp files
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(renamedFilePath)) {
      fs.unlinkSync(renamedFilePath);
    }

    // Return results
    res.json({
      success: true,
      transcript: transcription,
      summary: analysisResult.summary,
      keyPoints: analysisResult.keyPoints || [],
      questions: analysisResult.questions || [],
      actionItems: analysisResult.actionItems || [],
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Audio processing error:', error);
    
    // Clean up temp files on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (renamedFilePath && fs.existsSync(renamedFilePath)) {
      fs.unlinkSync(renamedFilePath);
    }

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        message: 'OpenAI API quota exceeded. Please check your billing settings.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        message: 'Invalid OpenAI API key. Please check configuration.' 
      });
    }

    // Generic error response
    res.status(500).json({ 
      message: 'Failed to process audio', 
      error: error.message 
    });
  }
});

// GET - Get supported audio formats info
router.get('/audio-info', authenticateToken, (req, res) => {
  res.json({
    supportedFormats: [
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'
    ],
    maxFileSize: '50MB',
    recommendedFormat: 'webm or mp3',
    notes: [
      'Higher quality audio produces better transcriptions',
      'Reduce background noise for best results',
      'Clear speech is essential for accurate transcription'
    ]
  });
});

module.exports = router;