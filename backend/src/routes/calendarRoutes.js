const express = require('express');
const router = express.Router();
const calendarCtrl = require('../controllers/calendarController');

router.post('/', calendarCtrl.createCalendar);
router.get('/', calendarCtrl.getCalendars);
router.get('/:id', calendarCtrl.getCalendarById);
router.put('/:id', calendarCtrl.updateCalendar);
router.delete('/:id', calendarCtrl.deleteCalendar);
router.get('/import/:year', calendarCtrl.importHolidays);

module.exports = router;