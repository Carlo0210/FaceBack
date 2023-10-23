// routes/faceRoutes.js
const express = require('express');
const router = express.Router();
const Face = require('../models/faceModel');
const faceapi = require('face-api.js');
const canvas = require('canvas');

// Set up face-api.js
faceapi.env.monkeyPatch({ canvas });
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load face-api.js models
async function loadModels() {
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
  await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
  // Load other models as needed
}
loadModels();

// Create a new face
router.post('/', async (req, res) => {
  try {
    const { Id, name, school, email, picture } = req.body;

    // Process the image to detect face landmarks
    const img = await canvas.loadImage(picture);
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks();

    if (detections.length === 0) {
      return res.status(400).json({ error: 'No face detected in the picture.' });
    }

    // Save the detected landmarks with the face data
    const newFace = new Face({ Id, name, school, email, picture, landmarks: detections });
    await newFace.save();

    res.status(201).json(newFace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create a new face.' });
  }
});

// Get a list of all faces
router.get('/', async (req, res) => {
  try {
    const faces = await Face.find();
    res.status(200).json(faces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch faces.' });
  }
});

// Get a single face by ID
router.get('/:id', async (req, res) => {
  try {
    const face = await Face.findById(req.params.id);
    if (!face) {
      return res.status(404).json({ error: 'Face not found.' });
    }
    res.status(200).json(face);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch face.' });
  }
});

// Update a face by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, school, email, picture } = req.body;
    const updatedFace = { name, school, email, picture };
    const face = await Face.findByIdAndUpdate(req.params.id, updatedFace, { new: true });
    if (!face) {
      return res.status(404).json({ error: 'Face not found.' });
    }
    res.status(200).json(face);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update face.' });
  }
});

// Delete a face by ID
router.delete('/:id', async (req, res) => {
  try {
    const face = await Face.findByIdAndDelete(req.params.id);
    if (!face) {
      return res.status(404).json({ error: 'Face not found.' });
    }
    res.status(200).json({ message: 'Face deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete face.' });
  }
});

module.exports = router;
