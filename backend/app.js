console.log("Starting app.js...");

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const profileRoutes = require('./routes/profile');
const audioRoutes = require('./routes/audio');

const app = express();

// Middleware
app.use(cors({
  credentials: true, // Allow cookies
  origin: process.env.FRONTEND_URL || true
}));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', audioRoutes);

// Serve frontend for any non-API routes
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  
  // For root path, serve dashboard.html
  if (req.path === '/') {
    return res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
  }
  
  // For other paths, try to serve the corresponding HTML file
  const htmlFile = req.path.endsWith('.html') ? req.path : req.path + '.html';
  const filePath = path.join(__dirname, '../frontend', htmlFile);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      // If file doesn't exist, redirect to login
      res.redirect('/login.html');
    }
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API endpoints available at: http://localhost:${PORT}/api`);
    console.log(`Audio processing enabled with OpenAI`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});