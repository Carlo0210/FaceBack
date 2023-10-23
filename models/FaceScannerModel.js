const mongoose = require('mongoose');

// Define the schema for the FaceScannerData
const faceScannerDataSchema = new mongoose.Schema({
  person_id: { type: String, required: true },
  person_name: { type: String, required: true },
  person_email: { type: String, required: true },
  person_school: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Create the model
const FaceScannerData = mongoose.model('FaceScannerData', faceScannerDataSchema);

module.exports = FaceScannerData;
