// faceModel.js
const mongoose = require('mongoose');

const faceSchema = new mongoose.Schema({
  eventId: String,
  name: String,
  school: String,
  email: String,
  faceDescription: [
    {
      faceBox: { x: Number, y: Number, width: Number, height: Number },
      faceDescriptor: [Number],
      faceLandmarks: Object,
      distances: [Number],
    },
  ],
  image: { type: Buffer, required: true },
});

const Face = mongoose.model('Face', faceSchema);

module.exports = Face;
