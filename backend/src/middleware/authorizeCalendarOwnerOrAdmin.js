const Calendar = require('../models/calendar.model');

const authorizeCalendarOwnerOrAdmin = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }
    const calendar = await Calendar.findById(req.params.id).select('user');
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    if (calendar.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Nu aveți permisiunea pentru această acțiune' });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

module.exports = authorizeCalendarOwnerOrAdmin;
