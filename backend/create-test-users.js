// create-test-users.js
// This script creates test users with specific IDs that match the generate-token.js script
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing test users if they exist (to ensure clean test data)
    await User.deleteOne({ email: 'admin@test.com' });
    await User.deleteOne({ email: 'user@test.com' });    // Create admin test user with ID from generate-token.js
    const adminId = new mongoose.Types.ObjectId('123456789012345678901234');
    const adminUser = new User({
      _id: adminId,
      googleId: 'admin-test-id',
      firstName: 'Admin',
      lastName: 'Test',
      email: 'admin@gmail.com', // This must match the email in generate-token.js
      profilePicture: 'https://via.placeholder.com/150',
      role: 'admin', // This must match the role in generate-token.js
      position: 'Prof',
      faculty: 'Test Faculty',
      department: 'Test Department',
      active: true,
      profileCompleted: true
    });
    await adminUser.save();    // Create regular test user with ID from generate-token.js
    const userId = new mongoose.Types.ObjectId('123456789012345678901235');
    const regularUser = new User({
      _id: userId,
      googleId: 'user-test-id',
      firstName: 'User',
      lastName: 'Test',
      email: 'user@gmail.com',
      profilePicture: 'https://via.placeholder.com/150',
      role: 'user',
      position: 'Asist',
      faculty: 'Test Faculty',
      department: 'Test Department',
      active: true,
      profileCompleted: true
    });
    await regularUser.save();

    console.log('Admin test user created/updated:', adminUser);
    console.log('Regular test user created/updated:', regularUser);
    
    console.log('\nYou can now generate tokens for these users with:');
    console.log('node generate-token.js');
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

createTestUsers();
