const express = require('express');
const TeachingHours = require('../models/teaching-hours.model');
const SemesterConfig = require('../models/semester-config.model');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/teaching-hours
 * @desc    Record new teaching hours
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      date, semesterId, activityType, startTime, endTime, 
      disciplineName, disciplineType, weekType, departmentId, facultyId,
      hourCount, comments 
    } = req.body;
    
    // Validate that date is in semester date range
    const semester = await SemesterConfig.findById(semesterId);
    if (!semester) {
      return res.status(400).json({ message: 'Semestrul specificat nu există' });
    }
    
    const dateObj = new Date(date);
    if (dateObj < semester.startDate || dateObj > semester.endDate) {
      return res.status(400).json({ message: 'Data nu face parte din semestrul selectat' });
    }
    
    // Create new teaching hours record
    const teachingHours = new TeachingHours({
      userId: req.user.id,
      date: dateObj,
      semesterId,
      activityType,
      startTime,
      endTime,
      disciplineName,
      disciplineType,
      weekType: weekType || semester.getWeekInfo(dateObj).weekType,
      departmentId,
      facultyId,
      hourCount,
      comments
    });
    
    await teachingHours.save();
    
    return res.status(201).json(teachingHours);
  } catch (error) {
    console.error('Record teaching hours error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/teaching-hours
 * @desc    Get teaching hours for the current user with filtering options
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      startDate, endDate, semesterId, activityType, 
      disciplineType, weekType, departmentId, facultyId 
    } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    if (semesterId) query.semesterId = semesterId;
    if (activityType) query.activityType = activityType;
    if (disciplineType) query.disciplineType = disciplineType;
    if (weekType) query.weekType = weekType;
    if (departmentId) query.departmentId = departmentId;
    if (facultyId) query.facultyId = facultyId;
    
    // Get teaching hours
    const teachingHours = await TeachingHours.find(query)
      .sort({ date: -1 })
      .populate('semesterId', 'name academicYear')
      .populate('departmentId', 'name')
      .populate('facultyId', 'name');
    
    return res.json(teachingHours);
  } catch (error) {
    console.error('Get teaching hours error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/teaching-hours/admin
 * @desc    Get all teaching hours with user info (admin only)
 * @access  Private/Admin
 */
router.get('/admin', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { 
      userId, startDate, endDate, semesterId, 
      activityType, disciplineType, weekType,
      departmentId, facultyId 
    } = req.query;
    
    // Build query
    const query = {};
    
    if (userId) query.userId = userId;
    
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    if (semesterId) query.semesterId = semesterId;
    if (activityType) query.activityType = activityType;
    if (disciplineType) query.disciplineType = disciplineType;
    if (weekType) query.weekType = weekType;
    if (departmentId) query.departmentId = departmentId;
    if (facultyId) query.facultyId = facultyId;
    
    // Get teaching hours with user info
    const teachingHours = await TeachingHours.find(query)
      .sort({ date: -1 })
      .populate('userId', 'firstName lastName email position')
      .populate('semesterId', 'name academicYear')
      .populate('departmentId', 'name')
      .populate('facultyId', 'name');
    
    return res.json(teachingHours);
  } catch (error) {
    console.error('Admin get teaching hours error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/teaching-hours/:id
 * @desc    Get teaching hours record by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const teachingHours = await TeachingHours.findById(req.params.id)
      .populate('semesterId', 'name academicYear')
      .populate('departmentId', 'name')
      .populate('facultyId', 'name');
    
    if (!teachingHours) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or an admin
    if (teachingHours.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    return res.json(teachingHours);
  } catch (error) {
    console.error('Get teaching hours by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/teaching-hours/:id
 * @desc    Update teaching hours record
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { 
      date, semesterId, activityType, startTime, endTime, 
      disciplineName, disciplineType, weekType, departmentId, facultyId,
      hourCount, comments 
    } = req.body;
    
    // Get the teaching hours record
    const teachingHours = await TeachingHours.findById(req.params.id);
    
    if (!teachingHours) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or an admin
    if (teachingHours.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    // Update fields
    if (date) teachingHours.date = new Date(date);
    if (semesterId) teachingHours.semesterId = semesterId;
    if (activityType) teachingHours.activityType = activityType;
    if (startTime) teachingHours.startTime = startTime;
    if (endTime) teachingHours.endTime = endTime;
    if (disciplineName) teachingHours.disciplineName = disciplineName;
    if (disciplineType) teachingHours.disciplineType = disciplineType;
    if (weekType) teachingHours.weekType = weekType;
    if (departmentId) teachingHours.departmentId = departmentId;
    if (facultyId) teachingHours.facultyId = facultyId;
    if (hourCount) teachingHours.hourCount = hourCount;
    if (comments !== undefined) teachingHours.comments = comments;
    
    teachingHours.updatedAt = Date.now();
    
    // Validate that date is in semester date range if semesterId is provided
    if (semesterId) {
      const semester = await SemesterConfig.findById(semesterId);
      if (!semester) {
        return res.status(400).json({ message: 'Semestrul specificat nu există' });
      }
      
      if (teachingHours.date < semester.startDate || teachingHours.date > semester.endDate) {
        return res.status(400).json({ message: 'Data nu face parte din semestrul selectat' });
      }
      
      // Update week type based on date and semester if not explicitly provided
      if (!weekType) {
        teachingHours.weekType = semester.getWeekInfo(teachingHours.date).weekType;
      }
    }
    
    await teachingHours.save();
    
    return res.json(teachingHours);
  } catch (error) {
    console.error('Update teaching hours error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   DELETE /api/teaching-hours/:id
 * @desc    Delete teaching hours record
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const teachingHours = await TeachingHours.findById(req.params.id);
    
    if (!teachingHours) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or an admin
    if (teachingHours.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    await teachingHours.deleteOne();
    
    return res.json({ message: 'Înregistrare ștearsă cu succes' });
  } catch (error) {
    console.error('Delete teaching hours error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;
