const express = require('express');
const Appointment = require('../models/Appointment');
const jwt = require('jsonwebtoken');

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

// Create appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctor, date, reason, goal, symptoms } = req.body;

    const appointment = new Appointment({
      userId: req.user.id,
      doctor,
      date,
      reason,
      goal,
      symptoms
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    console.error("❌ Appointment error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET - All appointments for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// ✅ DELETE - Remove appointment by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
