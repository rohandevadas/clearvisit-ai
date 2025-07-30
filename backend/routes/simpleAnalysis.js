// Create this file: backend/routes/simpleAnalysis.js
// Simple route to handle analysis cloud sync

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

// Simple schema for storing analysis data
const SimpleAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  analysisData: { type: mongoose.Schema.Types.Mixed, required: true }, // Store the entire analysis object
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SimpleAnalysisSchema.index({ userId: 1, appointmentId: 1 });

const SimpleAnalysis = mongoose.model('SimpleAnalysis', SimpleAnalysisSchema);

// Auth middleware
function authenticateToken(req, res, next) {
  // Try to get token from cookie first (like your other routes)
  let token = req.cookies?.token;
  
  // Fallback to header if no cookie (for API flexibility)
  if (!token) {
    token = req.headers['authorization'];
  }
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// POST - Save analysis data
router.post('/simple-analysis', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, analysisData } = req.body;

    if (!appointmentId || !analysisData) {
      return res.status(400).json({ message: 'appointmentId and analysisData are required' });
    }

    // Verify appointment belongs to user
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if analysis with this ID already exists
    const existingAnalysis = await SimpleAnalysis.findOne({
      userId: req.user.id,
      appointmentId: appointmentId,
      'analysisData.id': analysisData.id
    });

    if (existingAnalysis) {
      // Update existing analysis
      existingAnalysis.analysisData = analysisData;
      existingAnalysis.updatedAt = new Date();
      await existingAnalysis.save();
      
      console.log(`✅ Analysis updated: ${analysisData.id} for appointment ${appointmentId}`);
      return res.json({ success: true, message: 'Analysis updated' });
    }

    // Create new analysis
    const newAnalysis = new SimpleAnalysis({
      userId: req.user.id,
      appointmentId: appointmentId,
      analysisData: analysisData
    });

    await newAnalysis.save();
    
    console.log(`✅ Analysis saved: ${analysisData.id} for appointment ${appointmentId}`);
    res.json({ success: true, message: 'Analysis saved' });

  } catch (error) {
    console.error('❌ Error saving analysis:', error);
    res.status(500).json({ message: 'Failed to save analysis' });
  }
});

// GET - Load all analyses for an appointment
router.get('/simple-analysis/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Verify appointment belongs to user
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Get all analyses for this appointment
    const analyses = await SimpleAnalysis.find({
      userId: req.user.id,
      appointmentId: appointmentId
    }).sort({ 'analysisData.id': 1 });

    // Extract just the analysis data
    const analysisData = analyses.map(doc => doc.analysisData);

    console.log(`Loaded ${analysisData.length} analyses for appointment ${appointmentId}`);
    res.json({ 
      success: true, 
      analyses: analysisData,
      count: analysisData.length 
    });

  } catch (error) {
    console.error('Error loading analyses:', error);
    res.status(500).json({ message: 'Failed to load analyses' });
  }
});

// DELETE - Delete specific analysis
router.delete('/simple-analysis/:appointmentId/:analysisId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, analysisId } = req.params;

    // Verify appointment belongs to user
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Delete the analysis
    const result = await SimpleAnalysis.deleteOne({
      userId: req.user.id,
      appointmentId: appointmentId,
      'analysisData.id': parseInt(analysisId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    console.log(`Analysis deleted: ${analysisId} from appointment ${appointmentId}`);
    res.json({ success: true, message: 'Analysis deleted' });

  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ message: 'Failed to delete analysis' });
  }
});

// GET - Get all analyses for user (across all appointments)
router.get('/simple-analysis-all', authenticateToken, async (req, res) => {
  try {
    const analyses = await SimpleAnalysis.find({
      userId: req.user.id
    })
    .populate('appointmentId', 'doctor date reason')
    .sort({ createdAt: -1 })
    .limit(50); // Limit to recent 50

    const formattedAnalyses = analyses.map(doc => ({
      ...doc.analysisData,
      appointment: doc.appointmentId
    }));

    res.json({ 
      success: true, 
      analyses: formattedAnalyses,
      count: formattedAnalyses.length 
    });

  } catch (error) {
    console.error('Error loading all analyses:', error);
    res.status(500).json({ message: 'Failed to load analyses' });
  }
});

module.exports = router;