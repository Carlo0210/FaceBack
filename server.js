const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');
const Message = require('./models/Message');
const rooms = ['SportFest', 'Study Group', 'Business Mindset', 'Famyly Group'];
const cors = require('cors');
const bcrypt = require('bcrypt');
const Event = require('./models/Event');
const Person = require('./models/Person');
const Face   = require('./models/faceModel');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');
const faceapi = require('face-api.js');
const { createCanvas, loadImage } = require('canvas');
const bodyParser = require('body-parser');

require('dotenv').config();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes)

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

// Initialize face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const faceDetectionNet = faceapi.nets.ssdMobilenetv1;
const tinyFaceDetector = faceapi.nets.tinyFaceDetector;
const faceLandmarkNet = faceapi.nets.faceLandmark68Net;
const faceRecognitionNet = faceapi.nets.faceRecognitionNet;

const loadModels = async () => {
  const MODEL_PATH = './models'
  await faceDetectionNet.loadFromDisk(MODEL_PATH);
  await tinyFaceDetector.loadFromDisk(MODEL_PATH);
  await faceLandmarkNet.loadFromDisk(MODEL_PATH);
  await faceRecognitionNet.loadFromDisk(MODEL_PATH);
};
loadModels();
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/'); // You should create this folder to store uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
// Set up multer for file uploads
const upload = multer({storage: storage});


// Function to calculate the Euclidean distance between two face descriptors
function euclideanDistance(faceDescriptor1, faceDescriptor2) {
  const squaredDistance = faceDescriptor1
    .map((val, i) => (val - faceDescriptor2[i]) ** 2)
    .reduce((sum, val) => sum + val, 0);
  return Math.sqrt(squaredDistance);
}

app.post('/post-face', upload.single('image'), async (req, res) => {

  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  try {
    const { eventId, name, school, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }


    // Save the image data to MongoDB
    const imageBuffer = await fs.readFile(req.file.path);
    newFace.picture = imageBuffer;

    // Load the image from the file path
    const imagePath = path.join(__dirname, req.file.path);
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    let fullFaceDescriptions = await faceapi.detectAllFaces(canvas).withFaceLandmarks().withFaceDescriptors();

    if (fullFaceDescriptions.length === 0) {
      return res.status(400).json({ message: 'No face detected in the image' });
    }

    fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, { width: image.width, height: image.height });

    // Check if a similar face already exists in the database
    const existingFaces = await Face.find(); // Assuming you have a Face model defined

    let isDuplicateFaceDescription = false;
    let isDuplicateEmail = false;

for (const newFaceDescription of fullFaceDescriptions) {
  let isDuplicateFaceDescription = false; // Reset for each new face description
  let isDuplicateEmail = false; // Reset for each new face description

  const newFaceDescriptor = newFaceDescription.descriptor;

  for (const existingFace of existingFaces) {
    // Check if the eventId and email match before comparing faces
    if (existingFace.eventId === eventId) {
      // Check for duplicate face descriptions
      const existingFaceDescriptors = existingFace.faceDescription.map((faceData) => faceData.faceDescriptor);

      for (const existingFaceDescriptor of existingFaceDescriptors) {
        const distance = euclideanDistance(newFaceDescriptor, existingFaceDescriptor);

        // You can set a threshold for similarity, e.g., 0.6 (adjust as needed)
        if (distance < 0.6) {
          isDuplicateFaceDescription = true;
          break;
        }
      }

      if (isDuplicateFaceDescription) {
        break;
      }
    }

    // Check for duplicate email
    if (existingFace.email === email) {
      isDuplicateEmail = true;
      break;
    }
  }

  if (isDuplicateFaceDescription) {
    return res.status(400).json({ message: 'This face is already registered on this event.' });
  }
  if (isDuplicateEmail) {
    return res.status(400).json({ message: 'This email is already exist. Try another different email address.' });
  }
}

    // Save data to MongoDB, including faceDescriptions and distances
    const facesData = fullFaceDescriptions.map((faceDescription) => {
      const { x, y, width, height } = faceDescription.detection.box;
      const faceBox = { x, y, width, height };
      const faceDescriptor = faceDescription.descriptor;
      const faceLandmarks = faceDescription.landmarks;

      // Calculate the distances between this face and all other faces
      const distances = fullFaceDescriptions.map((otherFaceDescription) => {
        const distance = euclideanDistance(faceDescriptor, otherFaceDescription.descriptor);
        return distance;
      });

      return {
        faceBox,
        faceDescriptor,
        faceLandmarks,
        distances,
      };
    });



    // Save data to MongoDB, including faceDescriptions, distances, and picture
    const newFace = new Face({
      eventId,
      name,
      school,
      email,
      faceDescription: facesData,
      picture: imageBuffer,
    });

    await newFace.save();

    // Remove the uploaded image
    await fs.promises.unlink(req.file.path);

    res.status(201).json({ message: 'Face added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.post('/compare-faces', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Load the image from the file path
    const imagePath = path.join(__dirname, req.file.path);
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    let fullFaceDescriptions = await faceapi.detectAllFaces(canvas).withFaceLandmarks().withFaceDescriptors();

    if (fullFaceDescriptions.length === 0) {
      return res.status(400).json({ message: 'No face detected in the image' });
    }

    fullFaceDescriptions = faceapi.resizeResults(fullFaceDescriptions, { width: image.width, height: image.height });

    // Calculate distances between detected faces
    const detectedFaceDescriptors = fullFaceDescriptions.map(faceDescription => faceDescription.descriptor);

    // Retrieve faces from MongoDB
    const eventId = req.body.eventId; // Add an eventId parameter to the request
    const savedFaces = await Face.find({ eventId: eventId}); // Retrieve all faces from MongoDB

    if (savedFaces.length === 0) {
      return res.status(400).json({ message: 'No faces found in the database' });
    }

    // Define a threshold for similarity
    const similarityThreshold = 0.6; // Adjust this value as needed

    // Calculate distances and filter based on similarity
    const results = savedFaces.map(savedFace => {
      const savedFaceDescriptors = savedFace.faceDescription.map(faceData => faceData.faceDescriptor);
      const distances = savedFaceDescriptors.map(descriptor => {
        return euclideanDistance(detectedFaceDescriptors[0], descriptor);
      });

      // Choose the minimum distance as the similarity score
      const similarity = Math.min(...distances);

      // If the similarity is above the threshold, include it in the results
      if (similarity <= similarityThreshold) {
        return {
          eventId: savedFace.eventId,
          name: savedFace.name,
          school: savedFace.school,
          email: savedFace.email,
          similarity,
        };
      }
      // Otherwise, return null to exclude it from the results
      return null;
    });

    // Remove null entries (entries that didn't meet the similarity threshold)
    const filteredResults = results.filter(result => result !== null);

    if (filteredResults.length === 0) {
      return res.status(400).json({ message: 'This face is not register on the specific event.' });
    }

    res.status(200).json({ message: 'This face is completely verified.', results: filteredResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Endpoint to get all faces
app.get('/faces', async (req, res) => {
  try {
    const faces = await Face.find();
    res.json(faces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});





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
  const { title, date, collegeFacility, description, createdBy, createdId } = req.body;

  if (!title || !date || !collegeFacility || !description || !createdBy || !createdId) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  try {
    const newEvent = new Event({ title, date, collegeFacility, description, createdBy, createdId });
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

// Edit endpoint
app.put('/events/:id', async (req, res) => {
  const eventId = req.params.id;
  console.log('Received PUT request for event ID:', eventId);
  const { title, date, collegeFacility, description, createdBy, createdId } = req.body;

  if (!title || !date || !collegeFacility || !description || !createdBy || !createdId) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { title, date, collegeFacility, description, createdBy, createdId },
      { new: true } // Return the modified document
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    return res.status(200).json({ message: 'Event updated successfully.', event: updatedEvent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update event.' });
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
