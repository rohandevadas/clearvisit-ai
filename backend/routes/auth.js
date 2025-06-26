const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Registering:", email);

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    // Generate token immediately after registration
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    console.log("User registered and token generated");
    res.status(201).json({ 
      message: 'User registered successfully',
      token
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});
  

// Login
router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Logging in:", email);
  
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
  
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      res.json({ token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

module.exports = router;