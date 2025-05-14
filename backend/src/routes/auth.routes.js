const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/auth/google
 * @desc    Start Google OAuth authentication flow
 * @access  Public
 */
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email']
  // TESTING: Removed hostedDomain restriction to allow Gmail accounts
  // To restrict to institutional emails in production, uncomment the following line:
  // hostedDomain: 'ulbsibiu.ro'
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user by clearing auth cookie
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile information
 * @access  Private
 */
router.put('/profile', authMiddleware, authController.updateProfile);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify', authController.verifyToken);

module.exports = router;
