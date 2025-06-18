// This file is used to generate a JWT token for testing API endpoints
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Create a token for an admin user
const adminToken = jwt.sign(
  { 
    id: '123456789012345678901234', // Fake MongoDB ObjectId
    email: 'admin@gmail.com', 
    role: 'admin'  // The role must match exactly what's defined in the User model
  }, 
  process.env.JWT_SECRET || 'platacuora-super-secret-key-for-authentication-2025', 
  { expiresIn: '1d' }
);

// Create a token for a regular user
const userToken = jwt.sign(
  { 
    id: '123456789012345678901235', // Fake MongoDB ObjectId
    email: 'user@test.com', 
    role: 'user' 
  }, 
  process.env.JWT_SECRET || 'platacuora-super-secret-key-for-authentication-2025', 
  { expiresIn: '1d' }
);

console.log('Admin Token (for full access):');
console.log(adminToken);
console.log('\nUser Token (for limited access):');
console.log(userToken);
console.log('\nTo use this token, add it to your request headers as:');
console.log('Authorization: Bearer YOUR_TOKEN');
console.log('\nOr you can use it directly in Swagger by clicking the "Authorize" button and entering:');
console.log('Bearer YOUR_TOKEN');
