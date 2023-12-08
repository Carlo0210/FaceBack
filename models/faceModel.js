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
  faceDescription: Object,
  picture: {
    type: String,
  },
  mimeType: {
    type: String,
  },
});


const FaceDescription = mongoose.model("Face", faceSchema);


module.exports = FaceDescription;
