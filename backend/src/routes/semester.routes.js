const express = require('express');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const semCtrl = require('../controllers/semesterConfigController');
const router = express.Router();

/**
 * @route   POST /api/semester
 * @desc    Create a new semester configuration (admin only)
 * @access  Private/Admin
 */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.createSemesterConfig
);

/**
 * @route   GET /api/semester
 * @desc    Get all semester configurations
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  semCtrl.getSemesterConfigs
);

/**
 * @route   GET /api/semester/current
 * @desc    Get current active semester configuration
 * @access  Private
 */
router.get(
  '/current',
  authMiddleware,
  semCtrl.getCurrentSemesterConfig
);

/**
 * @route   GET /api/semester/:id
 * @desc    Get semester configuration by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  semCtrl.getSemesterConfigById
);

/**
 * @route   PUT /api/semester/:id
 * @desc    Update semester configuration (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.updateSemesterConfig
);

/**
 * @route   DELETE /api/semester/:id
 * @desc    Delete semester configuration (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.deleteSemesterConfig
);

/**
 * @route   GET /api/semester/:id/week-info
 * @desc    Get week information (odd/even) for a date in a semester
 * @access  Private
 */
router.get(
  '/:id/week-info',
  authMiddleware,
  semCtrl.getWeekInfo
);

module.exports = router;