const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  school: {
    type: String,
    required: true,
  },
  idNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
});

const Person = mongoose.model('Person', personSchema);


module.exports = Person;
