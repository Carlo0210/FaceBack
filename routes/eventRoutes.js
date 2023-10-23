// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Generate and return a registration link for the event
router.get('/:eventId/registration-link', (req, res) => {
  const { eventId } = req.params;
  const registrationLink = `http://localhost:5001/events/${eventId}/register`;
  res.json({ link: registrationLink });
});

// Register an attendee for the event
router.post('/:eventId/register', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const attendeeData = req.body;

    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Handle attendee registration logic here
    // Save attendee data to the event or attendee collection

    res.status(200).json({ message: 'Attendee registered successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register attendee.' });
  }
});

module.exports = router;
