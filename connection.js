require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to the MongoDB');
    // Additional code or operations after successful connection
  } catch (error) {
    console.error('Failed to connect to the MongoDB:', error);
    // Handle error appropriately
  }
}

connectToDatabase();
