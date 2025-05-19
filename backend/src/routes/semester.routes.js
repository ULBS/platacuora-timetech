const express = require('express');
const SemesterConfig = require('../models/semester-config.model');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/semester
 * @desc    Create a new semester configuration (admin only)
 * @access  Private/Admin
 */
router.post('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, calendarId, oddWeekStart } = req.body;
    
    // Create new semester configuration
    const semesterConfig = new SemesterConfig({
      name,
      academicYear,
      startDate,
      endDate,
      calendarId,
      oddWeekStart,
      createdBy: req.user.id
    });
    
    await semesterConfig.save();
    
    return res.status(201).json(semesterConfig);
  } catch (error) {
    console.error('Create semester config error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/semester
 * @desc    Get all semester configurations
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const semesterConfigs = await SemesterConfig.find()
      .sort({ academicYear: -1, startDate: -1 })
      .populate('calendarId', 'name academicYear');
      
    return res.json(semesterConfigs);
  } catch (error) {
    console.error('Get semester configs error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/semester/current
 * @desc    Get current active semester configuration
 * @access  Private
 */
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Find semester that includes the current date
    const semesterConfig = await SemesterConfig.findOne({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    }).populate('calendarId', 'name academicYear holidayList');
    
    if (!semesterConfig) {
      return res.status(404).json({ message: 'Nu există un semestru activ în prezent' });
    }
    
    return res.json(semesterConfig);
  } catch (error) {
    console.error('Get current semester error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/semester/:id
 * @desc    Get semester configuration by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const semesterConfig = await SemesterConfig.findById(req.params.id)
      .populate('calendarId', 'name academicYear holidayList');
    
    if (!semesterConfig) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    
    return res.json(semesterConfig);
  } catch (error) {
    console.error('Get semester config by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/semester/:id
 * @desc    Update semester configuration (admin only)
 * @access  Private/Admin
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, calendarId, oddWeekStart } = req.body;
    
    // Update semester configuration
    const semesterConfig = await SemesterConfig.findByIdAndUpdate(
      req.params.id,
      {
        name,
        academicYear,
        startDate,
        endDate,
        calendarId,
        oddWeekStart,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('calendarId', 'name academicYear');
    
    if (!semesterConfig) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    
    return res.json(semesterConfig);
  } catch (error) {
    console.error('Update semester config error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   DELETE /api/semester/:id
 * @desc    Delete semester configuration (admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const semesterConfig = await SemesterConfig.findByIdAndDelete(req.params.id);
    
    if (!semesterConfig) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    
    return res.json({ message: 'Configurație de semestru ștearsă cu succes' });
  } catch (error) {
    console.error('Delete semester config error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/semester/:id/week-info
 * @desc    Get week information (odd/even) for a date in a semester
 * @access  Private
 */
router.get('/:id/week-info', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Data este obligatorie' });
    }
    
    const dateObj = new Date(date);
    
    // Find semester configuration
    const semesterConfig = await SemesterConfig.findById(req.params.id);
    
    if (!semesterConfig) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    
    // Check if date is in semester date range
    if (dateObj < semesterConfig.startDate || dateObj > semesterConfig.endDate) {
      return res.status(400).json({ message: 'Data nu face parte din semestrul selectat' });
    }
    
    // Calculate if the week is odd or even
    const weekInfo = semesterConfig.getWeekInfo(dateObj);
    
    return res.json(weekInfo);
  } catch (error) {
    console.error('Get week info error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;
