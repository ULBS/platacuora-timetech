const express = require('express');
const Calendar = require('../models/calendar.model');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/calendar
 * @desc    Create a new calendar (admin only)
 * @access  Private/Admin
 */
router.post('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, daysOfWeek, holidayList } = req.body;
    
    // Create new calendar
    const calendar = new Calendar({
      name,
      academicYear,
      startDate,
      endDate,
      daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5], // Default Monday to Friday
      holidayList: holidayList || [],
      createdBy: req.user.id
    });
    
    await calendar.save();
    
    return res.status(201).json(calendar);
  } catch (error) {
    console.error('Create calendar error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/calendar
 * @desc    Get all calendars
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const calendars = await Calendar.find().sort({ academicYear: -1 });
    return res.json(calendars);
  } catch (error) {
    console.error('Get calendars error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/calendar/current
 * @desc    Get current active calendar
 * @access  Private
 */
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Find calendar that includes the current date
    const calendar = await Calendar.findOne({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    });
    
    if (!calendar) {
      return res.status(404).json({ message: 'Nu există un calendar activ în prezent' });
    }
    
    return res.json(calendar);
  } catch (error) {
    console.error('Get current calendar error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/calendar/:id
 * @desc    Get calendar by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const calendar = await Calendar.findById(req.params.id);
    
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    
    return res.json(calendar);
  } catch (error) {
    console.error('Get calendar by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/calendar/:id
 * @desc    Update calendar (admin only)
 * @access  Private/Admin
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, daysOfWeek, holidayList } = req.body;
    
    // Update calendar
    const calendar = await Calendar.findByIdAndUpdate(
      req.params.id,
      {
        name,
        academicYear,
        startDate,
        endDate,
        daysOfWeek,
        holidayList,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    
    return res.json(calendar);
  } catch (error) {
    console.error('Update calendar error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   DELETE /api/calendar/:id
 * @desc    Delete calendar (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const calendar = await Calendar.findByIdAndDelete(req.params.id);
    
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    
    return res.json({ message: 'Calendar șters cu succes' });
  } catch (error) {
    console.error('Delete calendar error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   POST /api/calendar/import-holidays
 * @desc    Import public holidays from an external API (admin only)
 * @access  Private/Admin
 */
router.post('/import-holidays', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { year, calendarId } = req.body;
    
    if (!year) {
      return res.status(400).json({ message: 'Anul este obligatoriu' });
    }
    
    // Find the calendar if ID is provided
    let calendar;
    if (calendarId) {
      calendar = await Calendar.findById(calendarId);
      
      if (!calendar) {
        return res.status(404).json({ message: 'Calendar negăsit' });
      }
    }
    
    // TODO: Implement holiday API integration here
    // For now, return a message about manual holiday imports
    
    return res.json({ 
      message: 'Importarea sărbătorilor va fi implementată ulterior. Pentru moment, vă rugăm să introduceți manual sărbătorile.',
      calendar
    });
  } catch (error) {
    console.error('Import holidays error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;
