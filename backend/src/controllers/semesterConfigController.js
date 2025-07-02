const SemesterConfig = require('../models/semester-config.model');
const Calendar = require('../models/calendar.model');
const { validateRequiredFields } = require('../utils/validation');

/**
 * Create a new semester configuration
 * POST /api/semester
 */
exports.createSemesterConfig = async (req, res) => {
  try {
     console.log('Primit de la frontend:', req.body);
    const {
      academicYear,
      semester,
      faculty,
      startDate,
      endDate,
      isMedicine,
      weeks,
      specialWeeks
    } = req.body;

    // Validate required fields
    const requiredFields = ['academicYear', 'semester', 'faculty', 'startDate', 'endDate'];
    const validation = validateRequiredFields(req.body, requiredFields);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Câmpuri obligatorii lipsă',
        missingFields: validation.missingFields 
      });
    }

    // Check for existing configuration
    const existingConfig = await SemesterConfig.findOne({
      academicYear,
      semester,
      faculty
    });

    if (existingConfig) {
      return res.status(409).json({ 
        message: 'Există deja o configurație pentru această facultate, an academic și semestru' 
      });
    }

    const cfg = new SemesterConfig({
      academicYear,
      semester,
      faculty,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isMedicine: isMedicine || false,
      weeks: weeks || [],
      specialWeeks: specialWeeks || [],
      createdBy: req.user.id
    });

    await cfg.save();
    res.status(201).json(cfg);
 } catch (err) {
  console.error('Create semester config error:', err);

  if (err.name === 'ValidationError') {
    // 🔑 Aici pui log-ul detaliat
    console.error('ValidationError:', JSON.stringify(err.errors, null, 2));

    return res.status(400).json({
      message: err.message,
      details: err.errors
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Configurația pentru această facultate și semestru există deja' });
  }

  res.status(500).json({ message: 'Eroare de server' });
}


};

/**
 * Get all semester configurations with filtering
 * GET /api/semester
 */
exports.getSemesterConfigs = async (req, res) => {
  try {
    const { faculty, academicYear, semester, status } = req.query;
    const query = {};

    // Apply filters
    if (faculty) query.faculty = faculty;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);
    if (status) query.status = status;

    const configs = await SemesterConfig
      .find(query)
      .sort({ academicYear: -1, semester: -1, faculty: 1 })
      .populate('createdBy', 'firstName lastName email');

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
    const { faculty } = req.query;
    const now = new Date();
    
    const query = { 
      startDate: { $lte: now }, 
      endDate: { $gte: now },
      status: 'active'
    };
    
    if (faculty) query.faculty = faculty;

    const cfg = await SemesterConfig
      .findOne(query)
      .populate('createdBy', 'firstName lastName email');

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
      .populate('createdBy', 'firstName lastName email');

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
      academicYear,
      semester,
      faculty,
      startDate,
      endDate,
      isMedicine,
      weeks,
      specialWeeks,
      status
    } = req.body;

    const cfg = await SemesterConfig.findById(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }

    // Update fields
    if (academicYear) cfg.academicYear = academicYear;
    if (semester) cfg.semester = semester;
    if (faculty) cfg.faculty = faculty;
    if (startDate) cfg.startDate = new Date(startDate);
    if (endDate) cfg.endDate = new Date(endDate);
    if (typeof isMedicine === 'boolean') cfg.isMedicine = isMedicine;
    if (weeks) cfg.weeks = weeks;
    if (specialWeeks) cfg.specialWeeks = specialWeeks;
    if (status) cfg.status = status;

    await cfg.save();
    res.json(cfg);
  } catch (err) {
    console.error('Update semester config error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Configurația pentru această facultate și semestru există deja' });
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

    // Calculate week info based on semester configuration
    const weekInfo = calculateWeekInfo(cfg, dateObj);
    res.json(weekInfo);
  } catch (err) {
    console.error('Get week info error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Generate weeks for semester configuration
 * POST /api/semester/:id/generate-weeks
 */
exports.generateWeeks = async (req, res) => {
  try {
    const { oddWeekStart = true } = req.body;
    const cfg = await SemesterConfig.findById(req.params.id);
    
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }

    // Generate weeks array
    const weeks = [];
    const startDate = new Date(cfg.startDate);
    let currentMonday = getMonday(startDate);
    let weekNumber = 1;

    while (currentMonday <= cfg.endDate) {
      const weekType = (oddWeekStart && weekNumber % 2 === 1) || (!oddWeekStart && weekNumber % 2 === 0) ? 'Impar' : 'Par';
      
      weeks.push({
        weekNumber: `S${String(weekNumber).padStart(2, '0')}`,
        startDate: new Date(currentMonday),
        weekType: weekType
      });

      currentMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);

      weekNumber++;
    }

    // For Medicine faculty, add special weeks if needed
    if (cfg.isMedicine && weekNumber <= 16) {
      for (let i = weekNumber; i <= 16; i++) {
        const weekType = (oddWeekStart && i % 2 === 1) || (!oddWeekStart && i % 2 === 0) ? 'Impar' : 'Par';
        
        cfg.specialWeeks.push({
          weekNumber: `S${String(i).padStart(2, '0')}`,
          startDate: new Date(currentMonday),
          weekType: weekType
        });
        
        currentMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);

      }
    }

    cfg.weeks = weeks;
    await cfg.save();

    res.json({
      message: 'Săptămânile au fost generate cu succes',
      totalWeeks: weeks.length,
      specialWeeks: cfg.specialWeeks.length,
      configuration: cfg
    });
  } catch (err) {
    console.error('Generate weeks error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Validate semester configuration against calendar
 * POST /api/semester/:id/validate-calendar
 */
exports.validateAgainstCalendar = async (req, res) => {
  try {
    const cfg = await SemesterConfig.findById(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }

    // Find corresponding calendar
    const calendar = await Calendar.findOne({
      academicYear: cfg.academicYear,
      semester: cfg.semester,
      faculty: cfg.faculty
    });

    if (!calendar) {
      return res.status(404).json({ 
        message: 'Nu există un calendar corespunzător pentru această configurație' 
      });
    }

    const validationResults = [];
    const issues = [];

    // Validate each week against calendar
    for (const week of cfg.weeks) {
      const weekValidation = validateWeekAgainstCalendar(week, calendar);
      validationResults.push(weekValidation);
      
      if (!weekValidation.isValid) {
        issues.push(weekValidation);
      }
    }

    // Check special weeks for Medicine
    if (cfg.isMedicine) {
      for (const specialWeek of cfg.specialWeeks) {
        const specialValidation = validateWeekAgainstCalendar(specialWeek, calendar);
        validationResults.push(specialValidation);
        
        if (!specialValidation.isValid) {
          issues.push(specialValidation);
        }
      }
    }

    res.json({
      isValid: issues.length === 0,
      totalWeeks: validationResults.length,
      validWeeks: validationResults.filter(v => v.isValid).length,
      invalidWeeks: issues.length,
      issues: issues,
      details: validationResults
    });
  } catch (err) {
    console.error('Validate against calendar error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get semester configurations by faculty
 * GET /api/semester/faculty/:faculty
 */
exports.getSemesterConfigsByFaculty = async (req, res) => {
  try {
    const { faculty } = req.params;
    const { academicYear, semester, status } = req.query;
    
    const query = { faculty };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);
    if (status) query.status = status;

    const configs = await SemesterConfig
      .find(query)
      .sort({ academicYear: -1, semester: -1 })
      .populate('createdBy', 'firstName lastName email');

    res.json(configs);
  } catch (err) {
    console.error('Get semester configs by faculty error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Activate semester configuration
 * PUT /api/semester/:id/activate
 */
exports.activateSemesterConfig = async (req, res) => {
  try {
    const cfg = await SemesterConfig.findById(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }

    // Deactivate other configurations for the same faculty/academic year/semester
    await SemesterConfig.updateMany(
      {
        faculty: cfg.faculty,
        academicYear: cfg.academicYear,
        semester: cfg.semester,
        _id: { $ne: cfg._id }
      },
      { status: 'archived' }
    );

    cfg.status = 'active';
    await cfg.save();

    res.json({
      message: 'Configurația a fost activată cu succes',
      configuration: cfg
    });
  } catch (err) {
    console.error('Activate semester config error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Add vacation period to semester configuration
 * POST /api/semester/:id/vacation-periods
 */
exports.addVacationPeriod = async (req, res) => {
  try {
    const { name, startDate, endDate, type } = req.body;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Numele, data de început și data de sfârșit sunt obligatorii' 
      });
    }

    const cfg = await SemesterConfig.findById(req.params.id);
    if (!cfg) {
      return res.status(404).json({ message: 'Configurație de semestru negăsită' });
    }

    // Add vacation period as special week
    cfg.specialWeeks.push({
      weekNumber: `VAC-${Date.now()}`, // Unique identifier for vacation
      startDate: new Date(startDate),
      weekType: 'Vacanta',
      name: name,
      type: type || 'vacation'
    });

    await cfg.save();
    res.json({
      message: 'Perioada de vacanță a fost adăugată cu succes',
      configuration: cfg
    });
  } catch (err) {
    console.error('Add vacation period error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

// Helper functions
function getMonday(date) {
  const d = new Date(date); 
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return new Date(d);
}


function calculateWeekInfo(config, date) {
  // Find the week that contains this date
  for (const week of config.weeks) {
    const weekEnd = new Date(week.startDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    if (date >= week.startDate && date <= weekEnd) {
      return {
        weekNumber: week.weekNumber,
        weekType: week.weekType,
        startDate: week.startDate,
        endDate: weekEnd,
        isSpecial: false
      };
    }
  }

  // Check special weeks for Medicine
  if (config.isMedicine) {
    for (const specialWeek of config.specialWeeks) {
      const weekEnd = new Date(specialWeek.startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (date >= specialWeek.startDate && date <= weekEnd) {
        return {
          weekNumber: specialWeek.weekNumber,
          weekType: specialWeek.weekType,
          startDate: specialWeek.startDate,
          endDate: weekEnd,
          isSpecial: true
        };
      }
    }
  }

  return null;
}

function validateWeekAgainstCalendar(week, calendar) {
  // Check if the week dates exist in calendar and match the week type
  const result = {
    weekNumber: week.weekNumber,
    isValid: true,
    issues: []
  };

  // Find calendar days for this week
  const weekStart = new Date(week.startDate);
  const weekEnd = new Date(week.startDate);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const calendarDays = calendar.days.filter(day => {
    const dayDate = new Date(day.date);
    return dayDate >= weekStart && dayDate <= weekEnd;
  });

  if (calendarDays.length === 0) {
    result.isValid = false;
    result.issues.push('Nu există zile în calendar pentru această săptămână');
    return result;
  }

  // Check if week types match
  const mismatchedDays = calendarDays.filter(day => 
    day.oddEven && day.oddEven !== week.weekType
  );

  if (mismatchedDays.length > 0) {
    result.isValid = false;
    result.issues.push(`Tipul săptămânii (${week.weekType}) nu se potrivește cu calendarul`);
  }

  return result;
}