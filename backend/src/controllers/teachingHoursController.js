const TeachingHours    = require('../models/teaching-hours.model');
const SemesterConfig   = require('../models/semester-config.model');

/**
 * Record new teaching hours
 * POST /api/teaching-hours
 */
exports.createTeachingHours = async (req, res) => {
  try {
    const { 
      date, semesterId, activityType, startTime, endTime, 
      disciplineName, disciplineType, weekType, departmentId, facultyId,
      hourCount, comments 
    } = req.body;

    // Validate semester exists
    const semester = await SemesterConfig.findById(semesterId);
    if (!semester) {
      return res.status(400).json({ message: 'Semestrul specificat nu există' });
    }

    const dateObj = new Date(date);
    if (dateObj < semester.startDate || dateObj > semester.endDate) {
      return res.status(400).json({ message: 'Data nu face parte din semestrul selectat' });
    }

    const record = new TeachingHours({
      userId:        req.user.id,
      date:          dateObj,
      semesterId,
      activityType,
      startTime,
      endTime,
      disciplineName,
      disciplineType,
      weekType:      weekType || semester.getWeekInfo(dateObj).weekType,
      departmentId,
      facultyId,
      hourCount,
      comments
    });

    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error('Create teaching hours error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get teaching hours for the current user
 * GET /api/teaching-hours
 */
exports.getTeachingHours = async (req, res) => {
  try {
    const { 
      startDate, endDate, semesterId, activityType, 
      disciplineType, weekType, departmentId, facultyId 
    } = req.query;

    const query = { userId: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }
    if (semesterId)    query.semesterId    = semesterId;
    if (activityType)  query.activityType  = activityType;
    if (disciplineType) query.disciplineType = disciplineType;
    if (weekType)      query.weekType      = weekType;
    if (departmentId)  query.departmentId  = departmentId;
    if (facultyId)     query.facultyId     = facultyId;

    const records = await TeachingHours
      .find(query)
      .sort({ date: -1 })
      .populate('semesterId', 'name academicYear')
      .populate('departmentId', 'name')
      .populate('facultyId', 'name');

    res.json(records);
  } catch (err) {
    console.error('Get teaching hours error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Admin: get all teaching hours
 * GET /api/teaching-hours/admin
 */
exports.adminGetTeachingHours = async (req, res) => {
  try {
    const { 
      userId, startDate, endDate, semesterId, 
      activityType, disciplineType, weekType,
      departmentId, facultyId 
    } = req.query;

    const query = {};
    if (userId)       query.userId         = userId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }
    if (semesterId)    query.semesterId    = semesterId;
    if (activityType)  query.activityType  = activityType;
    if (disciplineType) query.disciplineType = disciplineType;
    if (weekType)      query.weekType      = weekType;
    if (departmentId)  query.departmentId  = departmentId;
    if (facultyId)     query.facultyId     = facultyId;

    const records = await TeachingHours
      .find(query)
      .sort({ date: -1 })
      .populate('userId',      'firstName lastName email position')
      .populate('semesterId',  'name academicYear')
      .populate('departmentId','name')
      .populate('facultyId',   'name');

    res.json(records);
  } catch (err) {
    console.error('Admin get teaching hours error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};


/**
 * Get teaching hours by ID
 * GET /api/teaching-hours/:id
 */
exports.getTeachingHoursById = async (req, res) => {
  try {
    const record = await TeachingHours
      .findById(req.params.id)
      .populate('semesterId', 'name academicYear')
      .populate('departmentId','name')
      .populate('facultyId',   'name');

    if (!record) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    if (record.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    res.json(record);
  } catch (err) {
    console.error('Get teaching hours by ID error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Update teaching hours
 * PUT /api/teaching-hours/:id
 */
exports.updateTeachingHours = async (req, res) => {
  try {
    const {
      date, semesterId, activityType, startTime, endTime,
      disciplineName, disciplineType, weekType,
      departmentId, facultyId, hourCount, comments
    } = req.body;

    const record = await TeachingHours.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    if (record.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }

    if (date)      record.date          = new Date(date);
    if (semesterId) {
      const semester = await SemesterConfig.findById(semesterId);
      if (!semester) {
        return res.status(400).json({ message: 'Semestrul specificat nu există' });
      }
      if (record.date < semester.startDate || record.date > semester.endDate) {
        return res.status(400).json({ message: 'Data nu face parte din semestrul selectat' });
      }
      record.semesterId = semesterId;
      if (!weekType) {
        record.weekType = semester.getWeekInfo(record.date).weekType;
      }
    }
    if (activityType)    record.activityType   = activityType;
    if (startTime)       record.startTime      = startTime;
    if (endTime)         record.endTime        = endTime;
    if (disciplineName)  record.disciplineName = disciplineName;
    if (disciplineType)  record.disciplineType = disciplineType;
    if (weekType)        record.weekType       = weekType;
    if (departmentId)    record.departmentId   = departmentId;
    if (facultyId)       record.facultyId      = facultyId;
    if (hourCount)       record.hourCount      = hourCount;
    if (comments !== undefined) record.comments = comments;

    record.updatedAt = Date.now();
    await record.save();
    res.json(record);
  } catch (err) {
    console.error('Update teaching hours error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Delete teaching hours
 * DELETE /api/teaching-hours/:id
 */
exports.deleteTeachingHours = async (req, res) => {
  try {
    const record = await TeachingHours.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Înregistrare negăsită' });
    }
    if (record.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    await record.deleteOne();
    res.json({ message: 'Înregistrare ștearsă cu succes' });
  } catch (err) {
    console.error('Delete teaching hours error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

