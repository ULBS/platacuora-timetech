// test-with-middleware.js - Directly test the auth middleware with your token
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { authMiddleware, authorizeRoles } = require('./src/middleware/auth.middleware');

// Create a function to test the middleware directly
function testAuthMiddleware() {
  // Generate an admin token
  const adminToken = jwt.sign(
    { 
      id: '123456789012345678901234',
      email: 'admin@gmail.com', 
      role: 'admin'
    }, 
    process.env.JWT_SECRET || 'platacuora-super-secret-key-for-authentication-2025',
    { expiresIn: '1d' }
  );
  
  console.log('Generated admin token:', adminToken.substring(0, 20) + '...');
  console.log('JWT secret used for signing:', process.env.JWT_SECRET || 'platacuora-super-secret-key-for-authentication-2025');
  
  // Create mock Express req, res, next objects
  const req = {
    headers: {
      authorization: `Bearer ${adminToken}`
    },
    cookies: {}
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      console.log(`Response (${this.statusCode}):`, data);
      return this;
    }
  };
  
  const next = function() {
    console.log('Middleware passed! req.user =', req.user);
    
    // Now test the authorizeRoles middleware
    console.log('\nTesting authorizeRoles middleware with role "admin"');
    const roleMiddleware = authorizeRoles('admin');
    
    roleMiddleware(req, res, () => {
      console.log('Role authorization successful!');
    });
  };
  
  // Execute the middleware
  console.log('Testing authMiddleware...');
  try {
    authMiddleware(req, res, next);
  } catch (error) {
    console.error('Middleware error:', error);
  }
}

// Run the test
testAuthMiddleware();
