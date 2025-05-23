const { Calendar } = require('../models/calendar.model');

exports.createCalendar = async (req, res) => {
  try {
    const {
      name,
      academicYear,
      startDate,
      endDate,
      daysOfWeek,
      holidayList,
      faculty,
      semester
    } = req.body;

    // Create new calendar
    const calendar = new Calendar({
      name,
      academicYear,
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5],
      holidayList: holidayList || [],
      faculty,
      semester,
      user: req.user.id,
    });

    await calendar.save();
    res.status(201).json(calendar);
  } catch (error) {
    console.error('Create calendar error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.getCalendars = async (req, res) => {
  try {
    const calendars = await Calendar.find().sort({ academicYear: -1 });
    res.json(calendars);
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.getCurrentCalendar = async (req, res) => {
  try {
    const now = new Date();

    const calendar = await Calendar.findOne({
      startDate: { $lte: now },
      endDate:   { $gte: now }
    });

    if (!calendar) {
      return res
        .status(404)
        .json({ message: 'Nu există un calendar activ în prezent' });
    }

    res.json(calendar);
  } catch (error) {
    console.error('Get current calendar error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.getCalendarById = async (req, res) => {
  try {
    const calendar = await Calendar.findById(req.params.id);
    if (!calendar) {
      return res
        .status(404)
        .json({ message: 'Calendar negăsit' });
    }
    res.json(calendar);
  } catch (error) {
    console.error('Get calendar by ID error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};


exports.updateCalendar = async (req, res) => {
  try {
    const { name, academicYear, startDate, endDate, daysOfWeek, holidayList } = req.body;

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

    res.json(calendar);
  } catch (error) {
    console.error('Update calendar error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.deleteCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.findByIdAndDelete(req.params.id);
    if (!calendar) {
      return res
        .status(404)
        .json({ message: 'Calendar negăsit' });
    }
    res.json({ message: 'Calendar șters cu succes' });
  } catch (error) {
    console.error('Delete calendar error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};


exports.importHolidays = async (req, res) => {
  try {
    const { year, calendarId } = req.body;
    if (!year) {
      return res.status(400).json({ message: 'Anul este obligatoriu' });
    }

    const days = await Calendar.importHolidays(year);

    if (calendarId) {
      const calendar = await Calendar.findById(calendarId);
      if (!calendar) {
        return res.status(404).json({ message: 'Calendar negăsit' });
      }
      calendar.days = days;
      await calendar.save();
      return res.json({ calendar, importedDays: days.length });
    }

    return res.json({ importedDays: days.length, days });
  } catch (error) {
    console.error('Import holidays error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
};
