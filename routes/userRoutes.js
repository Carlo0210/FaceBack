const router = require('express').Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Attendee = require('../models/Person');

// Creating a user
router.post('/', async (req, res) => {
  try {
    let { userType, name, email, password, activationDate, expirationDate, picture, userCreatedId } = req.body;

    if (userType === 'Admin') {
      activationDate = '';
      expirationDate = '';
    }

    const newUser = new User({ userType, name, email, password, activationDate, expirationDate, picture, userCreatedId });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (e) {
    if (e.code === 11000) {
      res.status(400).json({ error: 'User already exists' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'Failed to register user.' });
    }
  }
});


router.post('/login', async(req, res)=> {
  try {
    const {email, password} = req.body;
    const user = await User.findByCredentials(email, password);
    await user.save();
    res.status(200).json(user);
  } catch (e) {
      res.status(400).json(e.message)
  }
})

// Add endpoint to create a new event
router.post('/events', async (req, res) => {
  try {
    const eventData = req.body;
    const event = await Event.create(eventData);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create the event.' });
  }
});

// Add endpoint to get all events
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

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
