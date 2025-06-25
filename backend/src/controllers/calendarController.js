const Calendar = require('../models/calendar.model');
const SemesterConfig = require('../models/semester-config.model');
const TeachingHours = require('../models/teaching-hours.model');
const xlsx = require('xlsx');



exports.createCalendar = async (req, res) => {
  try {
    const {
      academicYear,
      semester,
      faculty,
      startDate,
      endDate,
      title,
      days,
      status,
      holidayList,

    } = req.body;

    // Create new calendar
    const calendar = new Calendar({
      user: req.user.id,
      academicYear,
      semester,
      faculty,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: days || [],
      status: status || 'in_editare',
      title,
      holidayList: holidayList || [],
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
      endDate: { $gte: now }
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
    const {
      academicYear,
      semester,
      faculty,
      startDate,
      endDate,
      title,
      days,
      status,
      holidayList
    } = req.body;


    // Numai acele campuri se schimba, care sunt trimise in body
    const updates = {};
    if (academicYear) updates.academicYear = academicYear;
    if (semester) updates.semester = semester;
    if (faculty) updates.faculty = faculty;
    if (startDate) updates.startDate = new Date(startDate);
    if (endDate) updates.endDate = new Date(endDate);
    if (title) updates.title = title;
    if (days) updates.days = days;
    if (status) updates.status = status;
    if (holidayList) updates.holidayList = holidayList;

    updates.updatedBy = req.user.id;
    updates.updatedAt = Date.now();

    const calendar = await Calendar.findByIdAndUpdate(
      req.params.id,
      updates,
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
    const importedRaw = await Calendar.importHolidays(year);

    if (!calendarId) {
      return res.json({
        importedDays: importedRaw.length,
        days: importedRaw
      });
    }
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const existingDates = new Set(calendar.days.map(d => fmt(d.date)));

    const dayOfWeekNames = [
      'Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'
    ];

    const newHolidays = importedRaw
      .map(h => {
        const dt = new Date(h.date);
        return {
          date: dt,
          dayOfWeek: dayOfWeekNames[dt.getDay()],
          isWorkingDay: false,
          oddEven: '',
          semesterWeek: '',
          isHoliday: true,
          holidayName: h.holidayName
        };
      })
      .filter(hObj => {
        const localStr = fmt(hObj.date);
        if (existingDates.has(localStr)) {
          return false;
        }
        existingDates.add(localStr);
        return true;
      });

    if (newHolidays.length === 0) {
      return res.json({
        calendar,
        importedDays: 0,
        message: 'Nu au fost găsite sărbători noi de importat.'
      });
    }
    const updates = {
      days: [...calendar.days, ...newHolidays],
      updatedBy: req.user.id,
      updatedAt: Date.now()
    };

    const updatedCal = await Calendar.findByIdAndUpdate(
      calendarId,
      updates,
      { new: true, runValidators: true }
    );

    return res.json({
      calendar: updatedCal,
      importedDays: newHolidays.length
    });
  } catch (error) {
    console.error('Import holidays error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.generateCalendar = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }

    const cfg = await SemesterConfig.findOne({
      academicYear: cal.academicYear,
      semester: cal.semester,
      faculty: cal.faculty,
      status: 'active'
    });
    if (!cfg) {
      return res.status(404).json({
        message: 'Nu există o configurație de semestru activă pentru acest calendar'
      });
    }
    const teachingHoursList = await TeachingHours.find({
      academicYear: cal.academicYear,
      semester: cal.semester,
      faculty: cal.faculty,
      status: { $in: ['verificat', 'aprobat'] }
    });
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const importedHolidays = (cal.days || []).filter(d => d.isHoliday);
    const startRaw = new Date(cal.startDate);
    const endRaw = new Date(cal.endDate);
    let cursor = new Date(Date.UTC(
      startRaw.getUTCFullYear(),
      startRaw.getUTCMonth(),
      startRaw.getUTCDate()
    ));
    const endDate = new Date(Date.UTC(
      endRaw.getUTCFullYear(),
      endRaw.getUTCMonth(),
      endRaw.getUTCDate()
    ));
    const dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];
    const generatedDays = [];
    while (cursor <= endDate) {
      const key = fmt(cursor);
      const dayName = dayNames[cursor.getUTCDay()];
      const weekInfo = getWeekInfoFromConfig(cfg, cursor);
      if (weekInfo) {
        const matched = teachingHoursList.filter(r =>
          r.isSpecial
            ? r.specialWeek === weekInfo.weekNumber && r.dayOfWeek === dayName
            : (!r.oddEven || r.oddEven === weekInfo.weekType) && r.dayOfWeek === dayName
        );
        const dayObj = {
          date: new Date(cursor),
          dayOfWeek: dayName,
          isWorkingDay: matched.length > 0,
          oddEven: weekInfo.weekType,
          semesterWeek: weekInfo.weekNumber,
          isHoliday: false,
          holidayName: ''
        };
        generatedDays.push(dayObj);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const genMap = new Map();
    generatedDays.forEach(d => genMap.set(fmt(d.date), d));
    importedHolidays.forEach(h => {
      const key = fmt(new Date(h.date));
      if (genMap.has(key)) {
        const target = genMap.get(key);
        target.isHoliday = true;
        target.holidayName = h.holidayName;
        target.isWorkingDay = false;
      } else {
        generatedDays.push({
          date: new Date(h.date),
          dayOfWeek: h.dayOfWeek,
          isWorkingDay: false,
          oddEven: '',
          semesterWeek: '',
          isHoliday: true,
          holidayName: h.holidayName
        });
      }
    });
    cal.days = generatedDays;
    await cal.save();
    return res.json({ generated: generatedDays.length, calendar: cal });
  } catch (err) {
    console.error('Eroare la generateCalendar:', err);
    return res.status(500).json({ message: err.message });
  }
};

function getWeekInfoFromConfig(cfg, date) {
  for (const week of cfg.weeks) {
    const wStart = new Date(week.startDate);
    const wEnd = new Date(week.startDate);
    wEnd.setDate(wEnd.getDate() + 6);
    if (date >= wStart && date <= wEnd) {
      return {
        weekNumber: week.weekNumber,
        weekType: week.weekType,
        isSpecial: false,
        startDate: wStart,
        endDate: wEnd
      };
    }
  }
  if (cfg.isMedicine) {
    for (const special of cfg.specialWeeks) {
      const sStart = new Date(special.startDate);
      const sEnd = new Date(special.startDate);
      sEnd.setDate(sEnd.getDate() + 6);
      if (date >= sStart && date <= sEnd) {
        return {
          weekNumber: special.weekNumber,
          weekType: special.weekType,
          isSpecial: true,
          startDate: sStart,
          endDate: sEnd
        };
      }
    }
  }
  return null;
}





exports.exportToExcel = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    const pad = n => String(n).padStart(2, '0');
    const formatLocalDate = d =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const data = cal.days.map(d => ({
      date: formatLocalDate(d.date),
      dayOfWeek: d.dayOfWeek,
      isWorkingDay: d.isWorkingDay,
      oddEven: d.oddEven,
      semesterWeek: d.semesterWeek,
      isHoliday: d.isHoliday,
      holidayName: d.holidayName
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Calendar');
    const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res
      .header('Content-Disposition', `attachment; filename="calendar_${req.params.id}.xlsx"`)
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .send(buf);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la export' });
  }
};


exports.verifyCalendar = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }

    const cfg = await SemesterConfig.findOne({
      academicYear: cal.academicYear,
      semester: cal.semester,
      faculty: cal.faculty,
      status: 'active'
    });

    if (!cfg) {
      return res.status(404).json({
        message: 'Nu există o configurație de semestru activă pentru acest calendar'
      });
    }

    const startDate = new Date(Date.UTC(
      cal.startDate.getUTCFullYear(),
      cal.startDate.getUTCMonth(),
      cal.startDate.getUTCDate()
    ));
    const endDate = new Date(Date.UTC(
      cal.endDate.getUTCFullYear(),
      cal.endDate.getUTCMonth(),
      cal.endDate.getUTCDate()
    ));

    const daysMap = {};

    if (Array.isArray(cal.days)) {
      cal.days.forEach((dayObj, idx) => {
        if (!dayObj || !dayObj.date) {
          console.warn(` Atenție: cal.days[${idx}] nu are proprietatea 'date'. Obiect invalid:`, dayObj);
          return;
        }
        const d = new Date(dayObj.date);
        if (isNaN(d.getTime())) {
          console.warn(` Atenție: cal.days[${idx}].date nu este o dată validă:`, dayObj.date);
          return;
        }
        const key = d.toISOString().substring(0, 10);
        if (!Array.isArray(daysMap[key])) {
          daysMap[key] = [];
        }
        daysMap[key].push(dayObj);
      });
    } else {
      return res.status(400).json({
        message: 'calendar.days nu este un array valid'
      });
    }

    const errors = {
      missingDays: [],
      duplicateDays: [],
      weekMismatch: []
    };

    Object.entries(daysMap).forEach(([key, arr]) => {
      if (Array.isArray(arr) && arr.length > 1) {
        errors.duplicateDays.push({
          date: key,
          count: arr.length
        });
      }
    });

    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().substring(0, 10);
      const foundEntries = Array.isArray(daysMap[key]) ? daysMap[key] : [];

      if (foundEntries.length === 0) {
        errors.missingDays.push(key);
      } else {
        for (let i = 0; i < foundEntries.length; i++) {
          const dayObj = foundEntries[i];
          const tmp = new Date(dayObj.date);
          const actualDate = new Date(Date.UTC(
            tmp.getUTCFullYear(),
            tmp.getUTCMonth(),
            tmp.getUTCDate()
          ));
          const weekInfo = getWeekInfoFromConfig(cfg, actualDate);

          if (!weekInfo) {
            errors.weekMismatch.push({
              date: key,
              issue: 'Data nu cade în nicio săptămână definită în config'
            });
          } else {
            if (dayObj.semesterWeek !== weekInfo.weekNumber) {
              errors.weekMismatch.push({
                date: key,
                field: 'semesterWeek',
                expected: weekInfo.weekNumber,
                actual: dayObj.semesterWeek
              });
            }
            if (dayObj.oddEven !== weekInfo.weekType) {
              errors.weekMismatch.push({
                date: key,
                field: 'oddEven',
                expected: weekInfo.weekType,
                actual: dayObj.oddEven
              });
            }
          }
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (
      errors.missingDays.length === 0 &&
      errors.duplicateDays.length === 0 &&
      errors.weekMismatch.length === 0
    ) {
      cal.status = 'verificat';
      await cal.save();
      return res.json({
        message: 'Calendar verificat cu succes',
        calendar: cal
      });
    }

    return res.status(400).json({
      message: 'Calendar nevalid: au fost găsite erori',
      errors
    });

  } catch (err) {
    console.error('Eroare la verifyCalendar:', err);
    return res.status(500).json({ message: err.message });
  }
};


exports.addSpecialDays = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    (req.body || []).forEach(sd => {
      const dt = new Date(sd.date);
      if (!isNaN(dt)) {
        cal.days.push({
          date: dt,
          dayOfWeek: ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'][dt.getDay()],
          isWorkingDay: false,
          oddEven: '',
          semesterWeek: '',
          isHoliday: true,
          holidayName: sd.holidayName || ''
        });
      }
    });

    await cal.save();
    res.json({ added: req.body.length, calendar: cal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la adăugare zile speciale' });
  }
};

exports.getDayInfo = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Data este obligatorie' });

    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    const dt = new Date(date);
    const day = cal.days.find(d => d.date.toISOString().slice(0, 10) === dt.toISOString().slice(0, 10));
    if (!day) return res.status(404).json({ message: 'Data nu este în calendar' });

    res.json(day);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};