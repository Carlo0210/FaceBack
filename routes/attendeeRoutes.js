const express = require('express');
const router = express.Router();
const Attendee = require('../models/Attendee');


// Add endpoint to create a new attendee
router.post('/attendees', async (req, res) => {
  try {
    const attendeeData = req.body;
    const attendee = await Attendee.create(attendeeData);
    res.status(201).json(attendee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create the attendee.' });
  }
});

// Add endpoint to get all attendees
router.get('/attendees', async (req, res) => {
  try {
    const attendees = await Attendee.find();
    res.json(attendees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendees.' });
  }
});

module.exports = router;
