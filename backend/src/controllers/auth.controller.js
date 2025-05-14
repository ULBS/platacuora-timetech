const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const jwtConfig = require('../config/jwt.config');
const googleConfig = require('../config/google-oauth.config');

/**
 * Authentication controller handling user login, registration and token validation
 */
const authController = {
  /**
   * Google OAuth login callback
   * This is called by Passport after a successful Google authentication
   */
  googleCallback: (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, profile, info) => {
      try {
        if (err || !profile) {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
        }

        // Check if email is from allowed domains
        if (!profile.emails || !profile.emails[0].value) {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
        }
        
        const userEmail = profile.emails[0].value;
        const emailDomain = userEmail.split('@')[1];
        
        // Check if domain is in the allowed domains list
        // TESTING: This allows both @ulbsibiu.ro and @gmail.com
        // To restrict to only institutional emails, just remove 'gmail.com' from allowedDomains in google-oauth.config.js
        if (!googleConfig.allowedDomains.includes(emailDomain)) {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_domain&domain=${emailDomain}`);
        }

        // Find or create user
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
          // Create new user if they don't exist
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            position: 'titular', // Default value, can be updated later
            profileCompleted: false
          });
          await user.save();
        } else {
          // Update user info in case it changed on Google's side
          user.firstName = profile.name.givenName;
          user.lastName = profile.name.familyName;
          user.profilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : user.profilePicture;
          user.lastLogin = new Date();
          await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ 
          id: user._id,
          email: user.email,
          role: user.role 
        }, jwtConfig.secret, { 
          expiresIn: jwtConfig.expiresIn 
        });

        // Set cookie with the token
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: jwtConfig.cookieMaxAge
        });

        // Redirect to the frontend with token in URL parameters
        // (alternative approach if cookies aren't suitable)
        return res.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}`);      } catch (error) {
        console.error('Google authentication error:', error);
        
        // Add more specific error logging
        if (error.name === 'ValidationError') {
          console.error('MongoDB Validation Error:', error.message);
          if (error.errors) {
            Object.keys(error.errors).forEach(field => {
              console.error(`- Field "${field}":`, error.errors[field].message);
            });
          }
        } else if (error.name === 'MongoServerError' && error.code === 11000) {
          console.error('MongoDB Duplicate Key Error:', error.message);
        }
        
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error&message=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  },

  /**
   * Get current authenticated user information
   */
  getCurrentUser: async (req, res) => {
    try {
      // User is already attached to req by the auth middleware
      const user = await User.findById(req.user.id).select('-__v');
      
      if (!user) {
        return res.status(404).json({ message: 'Utilizator negăsit' });
      }

      return res.json(user);
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ message: 'Eroare de server' });
    }
  },

  /**
   * Logout user by clearing the auth cookie
   */
  logout: (req, res) => {
    res.clearCookie('auth_token');
    return res.json({ message: 'Delogare cu succes' });
  },

  /**
   * Update user profile information
   */
  updateProfile: async (req, res) => {
    try {
      const { faculty, department, position } = req.body;
      
      // Validate input
      if (!position || !['Prof', 'Conf', 'Lect', 'Asist', 'Drd', 'titular', 'asociat'].includes(position)) {
        return res.status(400).json({ message: 'Poziție invalidă' });
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        req.user.id, 
        { 
          faculty, 
          department, 
          position,
          profileCompleted: true
        }, 
        { new: true, runValidators: true }
      );

      return res.json(user);
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ message: 'Eroare de server' });
    }
  },

  /**
   * Verify JWT token and return basic user info
   */
  verifyToken: (req, res) => {
    const token = req.cookies.auth_token || req.body.token || 
                  req.query.token || req.headers['x-access-token'] ||
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ message: 'Token de autentificare negăsit' });
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      return res.json({ 
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        isValid: true 
      });
    } catch (error) {
      return res.status(401).json({ message: 'Token invalid sau expirat' });
    }
  }
};

module.exports = authController;
