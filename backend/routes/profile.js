const express = require('express');
const jwt = require('jsonwebtoken');
const MedicalProfile = require('../models/MedicalProfile');

console.log("✅ MedicalProfile model loaded:", typeof MedicalProfile);

const router = express.Router();

function authenticateToken(req, res, next) {
  const token = req.cookies.token; // Get from cookies instead of headers
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// GET /api/profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await MedicalProfile.findOne({ userId: req.user.id });
    res.json(profile || {});
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// POST /api/profile (create or update)
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Saving profile data:', Object.keys(req.body));
    
    // Prepare data with new field structure
    const data = { 
      ...req.body, 
      userId: req.user.id, 
      updatedAt: new Date() 
    };

    // Handle backward compatibility for heightWeight field
    if (data.height || data.weight) {
      const heightPart = data.height ? data.height.trim() : '';
      const weightPart = data.weight ? data.weight.trim() : '';
      data.heightWeight = [heightPart, weightPart].filter(Boolean).join(', ');
    }

    // Handle backward compatibility for emergencyContact field
    if (data.emergencyContactName || data.emergencyContactPhone) {
      const namePart = data.emergencyContactName ? data.emergencyContactName.trim() : '';
      const phonePart = data.emergencyContactPhone ? data.emergencyContactPhone.trim() : '';
      data.emergencyContact = [namePart, phonePart].filter(Boolean).join(' - ');
    }

    const profile = await MedicalProfile.findOneAndUpdate(
      { userId: req.user.id },
      data,
      { upsert: true, new: true }
    );

    console.log('✅ Profile saved successfully');
    res.json(profile);
  } catch (err) {
    console.error('❌ Error saving profile:', err);
    res.status(500).json({ message: 'Failed to save profile' });
  }
});

module.exports = router;