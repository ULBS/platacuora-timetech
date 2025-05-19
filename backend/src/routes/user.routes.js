const express = require('express');
const User = require('../models/user.model');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    return res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user roles/status (admin only)
 * @access  Private/Admin
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    
    return res.json({ message: 'Utilizator șters cu succes' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;
