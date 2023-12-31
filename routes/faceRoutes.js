const express = require('express');
const router = express.Router();
const Face = require('../models/faceModel'); // Assuming faceModel.js is in the same directory
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');
const faceapi = require('face-api.js');
const { createCanvas, loadImage } = require('canvas');
// Initialize face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const faceDetectionNet = faceapi.nets.ssdMobilenetv1;
const tinyFaceDetector = faceapi.nets.tinyFaceDetector;
const faceLandmarkNet = faceapi.nets.faceLandmark68Net;
const faceRecognitionNet = faceapi.nets.faceRecognitionNet;

const loadModels = async () => {
  const MODEL_PATH = './models';
  try {
    await faceDetectionNet.loadFromDisk(MODEL_PATH);
    await tinyFaceDetector.loadFromDisk(MODEL_PATH);
    await faceLandmarkNet.loadFromDisk(MODEL_PATH);
    await faceRecognitionNet.loadFromDisk(MODEL_PATH);
  } catch (error) {
    console.error('Error loading models:', error);
  }
};

const storage = multer.memoryStorage(); // Use memory storage to store the image as binary data
const upload = multer({ storage: storage });

// ... (other route handlers)

router.post('/post-face', upload.single('image'), async (req, res) => {
  try {
    const { eventId, name, school, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const imageBuffer = req.file.buffer;

    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    let fullFaceDescriptions = await faceapi.detectAllFaces(canvas).withFaceLandmarks().withFaceDescriptors();

    if (fullFaceDescriptions.length === 0) {
      return res.status(400).json({ message: 'No face detected in the image' });
    }

    fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, { width: image.width, height: image.height });

    // Save data to MongoDB, including faceDescriptions and image
    const facesData = fullFaceDescriptions.map((faceDescription) => {
      const { x, y, width, height } = faceDescription.detection.box;
      const faceBox = { x, y, width, height };
      const faceDescriptor = faceDescription.descriptor;
      const faceLandmarks = faceDescription.landmarks;

      // Calculate the distances between this face and all other faces
      const distances = fullFaceDescriptions.map((otherFaceDescription) => {
        const distance = euclideanDistance(faceDescriptor, otherFaceDescription.descriptor);
        return distance;
      });

      return {
        faceBox,
        faceDescriptor,
        faceLandmarks,
        distances,
      };
    });

    const newFace = new Face({ eventId, name, school, email, faceDescription: facesData, image: base64Image });
    await newFace.save();

    res.status(201).json({ message: 'Face added successfully' });
  } catch (error) {
    console.error('Error in /post-face route:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



router.post('/compare-faces', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Load the image from the file path
    const imagePath = path.join(__dirname, req.file.path);
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    let fullFaceDescriptions = await faceapi.detectAllFaces(canvas).withFaceLandmarks().withFaceDescriptors();

    if (fullFaceDescriptions.length === 0) {
      return res.status(400).json({ message: 'No face detected in the image' });
    }

    fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, { width: image.width, height: image.height });

    // Calculate distances between detected faces
    const detectedFaceDescriptors = fullFaceDescriptions.map(faceDescription => faceDescription.descriptor);

    // Retrieve faces from MongoDB
    const eventId = req.body.eventId; // Add an eventId parameter to the request
    const savedFaces = await Face.find({ eventId: eventId}); // Retrieve all faces from MongoDB

    if (savedFaces.length === 0) {
      return res.status(400).json({ message: 'No faces found in the database' });
    }

    // Define a threshold for similarity
    const similarityThreshold = 0.6; // Adjust this value as needed

    // Calculate distances and filter based on similarity
    const results = savedFaces.map(savedFace => {
      const savedFaceDescriptors = savedFace.faceDescription.map(faceData => faceData.faceDescriptor);
      const distances = savedFaceDescriptors.map(descriptor => {
        return euclideanDistance(detectedFaceDescriptors[0], descriptor);
      });

      // Choose the minimum distance as the similarity score
      const similarity = Math.min(...distances);

      // If the similarity is above the threshold, include it in the results
      if (similarity <= similarityThreshold) {
        return {
          eventId: savedFace.eventId,
          name: savedFace.name,
          school: savedFace.school,
          email: savedFace.email,
          similarity,
        };
      }
      // Otherwise, return null to exclude it from the results
      return null;
    });

    // Remove null entries (entries that didn't meet the similarity threshold)
    const filteredResults = results.filter(result => result !== null);

    if (filteredResults.length === 0) {
      return res.status(400).json({ message: 'This face is not register on the specific event.' });
    }

    res.status(200).json({ message: 'This face is completely verified.', results: filteredResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
