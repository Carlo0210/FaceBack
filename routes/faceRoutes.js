const express = require('express');
const multer = require('multer');
const router = express.Router();
const FaceModel = require('../models/faceModel'); // Assuming faceModel.js is in the same directory
const { InsightFace } = require('insightface'); // Replace with the actual library you are using

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize InsightFace
const insightFace = new InsightFace();

// Route to add a new face with an image
router.post('/post-face', upload.single('image'), async (req, res) => {
  try {
    // Extract necessary information from the request
    const { eventId, name, school, email } = req.body;
    const imageBuffer = req.file.buffer;

    // Perform face recognition and extract face description
    const faceDescription = await insightFace.recognize(imageBuffer);

    // Save face data to the database
    const newFace = new FaceModel({
      eventId,
      name,
      school,
      email,
      faceDescription: {
        image: imageBuffer.toString('base64'), // Convert image buffer to base64 for storage
        description: faceDescription,
      },
    });

    const savedFace = await newFace.save();
    res.json(savedFace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get faces for a specific event
router.get('/getFaces/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const faces = await FaceModel.find({ eventId });
    res.json(faces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add more routes as needed

module.exports = router;
