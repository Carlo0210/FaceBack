const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  date: Date,
  description: String,
  createdBy: String,
  createdId: String,
});

module.exports = mongoose.model('Event', eventSchema);
