const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');

/**
 * Authentication middleware to protect routes
 * Verifies the JWT token and attaches user data to the request
 */
const authMiddleware = (req, res, next) => {
  try {
    console.log('🔐 Auth Middleware - Checking for token...');
    console.log('📋 Headers:', req.headers.authorization ? 'Authorization header present' : 'No Authorization header');
    console.log('🍪 Cookies:', req.cookies ? Object.keys(req.cookies) : 'No cookies');
    
    // Get token from various sources
    let token = null;
    
    // Check each possible source in a way that avoids errors
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else if (req.body && req.body.token) {
      token = req.body.token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.headers && req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    } else if (req.headers && req.headers.authorization) {
      // Handle both "Bearer TOKEN" format and just "TOKEN" format
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader;
      }
    }

    console.log('🔑 Token found:', !!token);
    if (token) {
      console.log('🔐 Token preview:', token.substring(0, 20) + '...');
    }

    if (!token) {
      console.log('❌ No token found - returning 401');
      return res.status(401).json({ message: 'Accesul interzis. Autentificarea este necesară.' });
    }
      
    // Verify token - declare outside to make it available after the try block
    let decoded = jwt.verify(token, jwtConfig.secret);
    
    // Attach user data to the request
    req.user = decoded;
    
    // Continue to the next middleware or controller
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirat. Vă rugăm să vă autentificați din nou.' });
    }
    
    return res.status(401).json({ message: 'Token invalid. Autentificarea a eșuat.' });
  }
};

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role
 * @param {Array|String} roles - The role(s) that can access the route
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    // Make sure user is authenticated first
    if (!req.user) {
      return res.status(401).json({ message: 'Autentificarea este necesară' });
    }
    
    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Nu aveți permisiunile necesare pentru această acțiune' 
      });
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  authorizeRoles
};
