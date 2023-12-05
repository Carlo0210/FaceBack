const mongoose = require('mongoose');
const { isEmail } = require('validator');

const faceSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, "Can't be blank"],
  },
  name: {
    type: String,
    required: [true, "Can't be blank"],
  },
  school: {
    type: String,
    required: [true, "Can't be blank"],
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "Can't be blank"],
    index: true,
    validate: [isEmail, 'Invalid email'],
  },
  image: {
    type: Buffer, // Store the image data as a buffer
    required: true,
  },
  faceDescription: Object,
});

const FaceDescription = mongoose.model("Face", faceSchema);


module.exports = FaceDescription;
