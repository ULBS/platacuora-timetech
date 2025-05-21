const express = require('express');
const calendarCtrl = require('../controllers/calendarController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/calendar
 * @desc    Create a new calendar (admin only)
 * @access  Private/Admin
 */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.createCalendar    
);



/**
 * @route   GET /api/calendar
 * @desc    Get all calendars
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  calendarCtrl.getCalendars
);


/**
 * @route   GET /api/calendar/current
 * @desc    Get current active calendar
 * @access  Private
 */
router.get(
  '/current',
  authMiddleware,
  calendarCtrl.getCurrentCalendar
);

/**
 * @route   GET /api/calendar/:id
 * @desc    Get calendar by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  calendarCtrl.getCalendarById
);

/**
 * @route   PUT /api/calendar/:id
 * @desc    Update calendar (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.updateCalendar
);


/**
 * @route   DELETE /api/calendar/:id
 * @desc    Delete calendar (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.deleteCalendar
);

/**
 * @route   POST /api/calendar/import-holidays
 * @desc    Import public holidays from an external API (admin only)
 * @access  Private/Admin
 */
router.post(
  '/import-holidays',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.importHolidays
);

module.exports = router;
