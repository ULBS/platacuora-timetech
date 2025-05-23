const SemesterConfig = require('../models/semester-config.model');


/**
 * Create a new semester configuration
 * POST /api/semester
 */
exports.createSemesterConfig = async (req, res) => {
  try {
    const {
      name,
      academicYear,
      startDate,
      endDate,
      calendarId,
      oddWeekStart
    } = req.body;

    if (!name || !academicYear || !startDate || !endDate || !calendarId) {
      return res
        .status(400)
        .json({ message: 'Trebuie să trimiți name, academicYear, startDate, endDate și calendarId.' });
    }

    const cfg = new SemesterConfig({
      name,
      academicYear,
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      calendarId,
      oddWeekStart,
      createdBy:   req.user.id
    });

    await cfg.save();
    res.status(201).json(cfg);
  } catch (err) {
    console.error('Create semester config error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get all semester configurations
 * GET /api/semester
 */
exports.getSemesterConfigs = async (req, res) => {
  try {
    const configs = await SemesterConfig
      .find()
      .sort({ academicYear: -1, startDate: -1 })
      .populate('calendarId', 'academicYear startDate endDate days');

    res.json(configs);
  } catch (err) {
    console.error('Get semester configs error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get current active semester configuration
 * GET /api/semester/current
 */
exports.getCurrentSemesterConfig = async (req, res) => {
  try {
    const now = new Date();
    const cfg = await SemesterConfig
      .findOne({ startDate: { $lte: now }, endDate: { $gte: now } })
      .populate('calendarId', 'academicYear startDate endDate days');

    if (!cfg) {
      return res
        .status(404)
        .json({ message: 'Nu există un semestru activ în prezent' });
    }
    res.json(cfg);
  } catch (err) {
    console.error('Get current semester error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get semester configuration by ID
 * GET /api/semester/:id
 */
exports.getSemesterConfigById = async (req, res) => {
  try {
    const cfg = await SemesterConfig
      .findById(req.params.id)
      .populate('calendarId', 'academicYear startDate endDate days');

    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    res.json(cfg);
  } catch (err) {
    console.error('Get semester config by ID error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get semester configuration by ID
 * GET /api/semester/:id
 */
exports.getSemesterConfigById = async (req, res) => {
  try {
    const cfg = await SemesterConfig
      .findById(req.params.id)
      .populate('calendarId', 'academicYear startDate endDate days');

    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    res.json(cfg);
  } catch (err) {
    console.error('Get semester config by ID error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Update semester configuration
 * PUT /api/semester/:id
 */
exports.updateSemesterConfig = async (req, res) => {
  try {
    const {
      name,
      academicYear,
      startDate,
      endDate,
      calendarId,
      oddWeekStart
    } = req.body;

    const cfg = await SemesterConfig.findByIdAndUpdate(
      req.params.id,
      {
        name,
        academicYear,
        startDate:     new Date(startDate),
        endDate:       new Date(endDate),
        calendarId,
        oddWeekStart,
        updatedBy:     req.user.id,
        updatedAt:     Date.now()
      },
      { new: true, runValidators: true }
    ).populate('calendarId', 'academicYear startDate endDate days');

    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    res.json(cfg);
  } catch (err) {
    console.error('Update semester config error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Delete semester configuration
 * DELETE /api/semester/:id
 */
exports.deleteSemesterConfig = async (req, res) => {
  try {
    const cfg = await SemesterConfig.findByIdAndDelete(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    res.json({ message: 'Configurație de semestru ștearsă cu succes' });
  } catch (err) {
    console.error('Delete semester config error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get week information for a date in a semester
 * GET /api/semester/:id/week-info?date=YYYY-MM-DD
 */
exports.getWeekInfo = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Data este obligatorie' });
    }
    const dateObj = new Date(date);
    const cfg = await SemesterConfig.findById(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }
    if (dateObj < cfg.startDate || dateObj > cfg.endDate) {
      return res
        .status(400)
        .json({ message: 'Data nu face parte din semestrul selectat' });
    }
    const weekInfo = cfg.getWeekInfo(dateObj);
    res.json(weekInfo);
  } catch (err) {
    console.error('Get week info error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};