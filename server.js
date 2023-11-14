const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const faceRoutes = require('./routes/faceRoutes');
const User = require('./models/User');
const Message = require('./models/Message');
const rooms = ['SportFest', 'Study Group', 'Business Mindset', 'Famyly Group'];
const cors = require('cors');
const bcrypt = require('bcrypt');
const Event = require('./models/Event');
const Person = require('./models/Person');
const Face   = require('./models/faceModel');
const bodyParser = require('body-parser');


require('dotenv').config();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes)
app.use('', faceRoutes)

require('./connection')
// Middleware
app.use(bodyParser.json());

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: 'https://facerecognition1234.netlify.app',
    methods: ['GET', 'POST', 'DELETE', 'PUT']
  }
})


async function getLastMessagesFromRoom(room){
  let roomMessages = await Message.aggregate([
    {$match: {to: room}},
    {$group: {_id: '$date', messagesByDate: {$push: '$$ROOT'}}}
  ])
  return roomMessages;
}

function sortRoomMessagesByDate(messages){
  return messages.sort(function(a, b){
    let date1 = a && a._id ? a._id.split('/') : [];
    let date2 = b._id.split('/');

    date1 = date1[2] + date1[0] + date1[1]
    date2 =  date2[2] + date2[0] + date2[1];

    return date1 < date2 ? -1 : 1
  })
}

// Move this outside the socket.io connection
app.delete('/logout', async (req, res) => {
  try {
    const { _id, newMessages } = req.body;
    const user = await User.findById(_id);
    // Perform the necessary operations on user and newMessages here
    await user.save();
    const members = await User.find();
    res.status(200).send();
  } catch (e) {
    console.error(e);
    res.status(400).send();
  }
});

// Handle user deletion using a more consistent endpoint
app.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Failed to delete user.' });
  }
});

app.get('/rooms', (req, res)=> {
  res.json(rooms)
})

app.get('/UserInformation', (req, res) => {
  User.find()
  .then(users => res.json(users))
  .catch(err => res.json(err))
})

app.post('/register', async (req, res) => {
  const { userType, name, email, password, activationDate, expirationDate, picture } = req.body;

  if (!userType || !name || !email || !password || !activationDate || !expirationDate || !picture) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  try {
    const newUser = new User({ userType, name, email, password, activationDate, expirationDate, picture });
    await newUser.save();
    return res.status(201).json({ message: 'Perfect Successfully Data Registered.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register user.' });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = req.body;

    // Check if a new password is provided
    if (updatedUser.password) {
      const saltRounds = 10; // Adjust the number of salt rounds as needed
      const hashedPassword = await bcrypt.hash(updatedUser.password, saltRounds);
      updatedUser.password = hashedPassword;
    }

    // Update the user in the database
    const user = await User.findByIdAndUpdate(userId, updatedUser, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Add this route to handle user deletion
app.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (e) {
    console.log(e);
    res.status(400).json({ error: 'Failed to delete user.' });
  }
});


app.post('/events', async (req, res) => {
  const { title, date, description, createdBy, createdId } = req.body;

  if (!title || !date || !description || !createdBy || !createdId) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  try {
    const newEvent = new Event({ title, date, description, createdBy, createdId });
    await newEvent.save();
    return res.status(201).json({ message: 'Event created successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create event.' });
  }
});

app.get('/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});



app.post('/register/attendee', async (req, res) => {
  const { eventId, name, school, idNumber, email } = req.body;

  if (!eventId || !name || !school || !email) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  // Assign a default value to idNumber if it's null
  const adjustedIdNumber = idNumber || ' ';

  try {
    const newPerson = new Person({ eventId, name, school, idNumber: adjustedIdNumber, email });
    await newPerson.save();
    return res.status(201).json({ message: 'Attendee registered successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to register attendee.' });
  }
});

app.get('/facess', async (req, res) => {
  try {
    const faces = await Face.find();
    res.json(faces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/AttendeeInformation', (req, res) => {
  Face.find()
  .then(faces => res.json(faces))
  .catch(err => res.json(err))
})






server.listen(process.env.PORT || 6010, ()=> {
  console.log('listening to port Atlas mongodb')
})
