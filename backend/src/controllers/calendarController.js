const { Calendar } = require('../models');

exports.createCalendar = async (req, res) => {
  try {
    const calendar = new Calendar(req.body);
    await calendar.save();
    res.status(201).json(calendar);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCalendars = async (req, res) => {
  try {
    const calendars = await Calendar.find();
    res.json(calendars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCalendarById = async (req, res) => {
  try {
    const calendar = await Calendar.findById(req.params.id);
    if (!calendar) return res.status(404).json({ error: 'Calendar not found' });
    res.json(calendar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!calendar) return res.status(404).json({ error: 'Calendar not found' });
    res.json(calendar);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCalendar = async (req, res) => {
  try {
    const calendar = await Calendar.findByIdAndDelete(req.params.id);
    if (!calendar) return res.status(404).json({ error: 'Calendar not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importHolidays = async (req, res) => {
  try {
    const { year } = req.params;
    const days = await Calendar.importHolidays(year);
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
