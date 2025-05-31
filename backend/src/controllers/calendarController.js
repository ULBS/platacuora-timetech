const Calendar = require('../models/calendar.model');
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
      holidayList,
      
    } = req.body;

    // Create new calendar
    const calendar = new Calendar({
      user: req.user.id,
      academicYear,
      semester,
      faculty,
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
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
    const {
      academicYear,
      semester,
      faculty,
      startDate,
      endDate,
      holidayList
    } = req.body;

    const calendar = await Calendar.findByIdAndUpdate(
      req.params.id,
      {
        academicYear,
        semester,
        faculty,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        holidayList: holidayList || [],
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

    // Asa gandeam, calendarId ar fi folosit pentru a actualiza 
    // holidayList-ul unui calendar existent, dar inca n-am reusit :))

    // if (calendarId) {
    //   const calendar = await Calendar.findById(calendarId);
    //   if (!calendar) {
    //     return res.status(404).json({ message: 'Calendar negăsit' });
    //   }
    //   calendar.days = days;
    //   await calendar.save();
    //   return res.json({ calendar, importedDays: days.length });
    // }

   return res.json({ importedDays: days.length, days });
  } catch (error) {
    console.error('Import holidays error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
};

/*
Trebuie ceva (ex. daysOfWeek) care să fie setat în calendar înainte de a putea genera
exports.generateCalendar = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    const days     = [];
    let cursor     = new Date(cal.startDate);
    let weekIndex  = 1;
    while (cursor <= cal.endDate) {
      const dow = cursor.getDay(); // 0=Duminica .. 6=Sambata
      if (cal.daysOfWeek.includes(dow)) {
        days.push({
          date:         new Date(cursor),
          dayOfWeek:    ['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata'][dow],
          isWorkingDay: true,
          oddEven:      (weekIndex % 2) ? 'Impar' : 'Par',
          semesterWeek: `S${String(weekIndex).padStart(2,'0')}`,
          isHoliday:    false,
          holidayName:  ''
        });
      }
      if (dow === 0) weekIndex++;
      cursor.setDate(cursor.getDate() + 1);
    }

    cal.days = days;
    await cal.save();
    res.json({ generated: days.length, calendar: cal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
*/

exports.exportToExcel = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    const pad = n => String(n).padStart(2,'0');
    const formatLocalDate = d =>
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    const data = cal.days.map(d => ({
      date:         formatLocalDate(d.date),
      dayOfWeek:    d.dayOfWeek,
      isWorkingDay: d.isWorkingDay,
      oddEven:      d.oddEven,
      semesterWeek: d.semesterWeek,
      isHoliday:    d.isHoliday,
      holidayName:  d.holidayName
    }));

    const ws  = xlsx.utils.json_to_sheet(data);
    const wb  = xlsx.utils.book_new();
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

/*
Trebuie ceva (ex. daysOfWeek) care să fie setat în calendar înainte de a putea valida
exports.validateCalendar = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) {
      return res.status(404).json({ message: 'Calendarul nu a fost găsit.' });
    }

    const { startDate, endDate, daysOfWeek, days } = cal;

    // 1) Verificări preliminare
    if (!Array.isArray(daysOfWeek)) {
      return res.status(400).json({ message: 'Câmpul daysOfWeek nu este definit corect.' });
    }
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ message: 'Nu există niciun element în days – generează mai întâi calendarul.' });
    }

    // 2) Calculează câte zile “așteptate” ar trebui să fie
    let cursor = new Date(startDate);
    let expectedDays = 0;
    while (cursor <= endDate) {
      if (daysOfWeek.includes(cursor.getDay())) {
        expectedDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // 3) Formatare locală (fără ISO/UTC)
    const pad = n => String(n).padStart(2,'0');
    const fmt = d =>
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    // 4) Date unice și rapoarte de consistență
    const uniqueLocal = new Set(days.map(d => {
      if (!(d.date instanceof Date)) {
        throw new Error(`Data invalidă în days: ${d.date}`);
      }
      return fmt(d.date);
    }));

    const duplicateRows = days.length - uniqueLocal.size;
    const missingDays   = Math.max(0, expectedDays - uniqueLocal.size);

    // 5) Zile generate care nu corespund zilelor de week şi cele în afara intervalului
    const wrongWeekdays = days
      .filter(d => !daysOfWeek.includes(d.date.getDay()))
      .map(d => fmt(d.date));

    const outOfRange = days
      .filter(d => d.date < startDate || d.date > endDate)
      .map(d => fmt(d.date));

    return res.json({
      totalRows:     days.length,
      expectedDays,
      missingDays,
      duplicateRows,
      wrongWeekdays,
      outOfRange,
    });

  } catch (err) {
    // Afișează eroarea reală ca să poți debuga
    console.error('Eroare validateCalendar:', err);
    res.status(500).json({ message: err.message });
  }
};
*/


exports.addSpecialDays = async (req, res) => {
  try {
    const cal = await Calendar.findById(req.params.id);
    if (!cal) return res.status(404).json({ message: 'Calendar negăsit' });

    (req.body || []).forEach(sd => {
      const dt = new Date(sd.date);
      if (!isNaN(dt)) {
        cal.days.push({
          date:        dt,
          dayOfWeek:   ['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata'][dt.getDay()],
          isWorkingDay:false,
          oddEven:     '',
          semesterWeek:'',
          isHoliday:   true,
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

    const dt   = new Date(date);
    const day = cal.days.find(d => d.date.toISOString().slice(0,10) === dt.toISOString().slice(0,10));
    if (!day) return res.status(404).json({ message: 'Data nu este în calendar' });

    res.json(day);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};