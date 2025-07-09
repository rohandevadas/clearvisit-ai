// test-setup.js - Run this to verify your setup
// Place this file in your backend directory and run: node test-setup.js

console.log("🧪 ClearVisit AI Setup Test\n");

// Test 1: Environment Variables
console.log("1. Checking Environment Variables...");
require('dotenv').config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'OPENAI_API_KEY'];
const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missing.length > 0) {
  console.log("❌ Missing environment variables:", missing.join(', '));
  console.log("   Please check your .env file");
} else {
  console.log("✅ All environment variables present");
}

// Test 2: Dependencies
console.log("\n2. Checking Dependencies...");
const requiredPackages = [
  'express', 'mongoose', 'bcrypt', 'jsonwebtoken', 
  'cors', 'dotenv', 'multer', 'openai'
];

const missingPackages = [];
for (const pkg of requiredPackages) {
  try {
    require(pkg);
  } catch (err) {
    missingPackages.push(pkg);
  }
}

if (missingPackages.length > 0) {
  console.log("❌ Missing packages:", missingPackages.join(', '));
  console.log("   Run: npm install", missingPackages.join(' '));
} else {
  console.log("✅ All required packages installed");
}

// Test 3: OpenAI Connection
console.log("\n3. Testing OpenAI Connection...");
async function testOpenAI() {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Hello from ClearVisit AI!"' }],
      max_tokens: 20
    });

    console.log("✅ OpenAI connection successful");
    console.log("   Response:", response.choices[0].message.content);
  } catch (error) {
    console.log("❌ OpenAI connection failed:", error.message);
    if (error.code === 'invalid_api_key') {
      console.log("   Check your OPENAI_API_KEY in .env file");
    } else if (error.code === 'insufficient_quota') {
      console.log("   Add billing information to your OpenAI account");
    }
  }
}

// Test 4: Directory Structure
console.log("\n4. Checking Directory Structure...");
const fs = require('fs');
const path = require('path');

const requiredDirs = ['models', 'routes', '../frontend'];
const requiredFiles = [
  'models/User.js',
  'models/Appointment.js', 
  'models/MedicalProfile.js',
  'routes/auth.js',
  'routes/appointments.js',
  'routes/profile.js',
  'routes/audio.js',
  '../frontend/dashboard.html',
  '../frontend/login.html',
  '../frontend/visit.html'
];

for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ Directory exists: ${dir}`);
  } else {
    console.log(`❌ Missing directory: ${dir}`);
  }
}

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ File exists: ${file}`);
  } else {
    console.log(`❌ Missing file: ${file}`);
  }
}

// Test 5: MongoDB Connection
console.log("\n5. Testing MongoDB Connection...");
async function testMongoDB() {
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connection successful");
    await mongoose.disconnect();
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
    console.log("   Make sure MongoDB is running or check your MONGO_URI");
  }
}

// Run all tests
async function runTests() {
  if (!missing.length && !missingPackages.length) {
    await testOpenAI();
    await testMongoDB();
  }
  
  console.log("\n🏁 Setup Test Complete!");
  console.log("\nNext Steps:");
  console.log("1. Fix any issues shown above");
  console.log("2. Run: npm run dev");
  console.log("3. Open: http://localhost:5000");
  console.log("4. Test the audio recording features!");
}

runTests();