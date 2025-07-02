const sinon = require('sinon');
const Calendar = require('../src/models/calendar.model');
const SemesterConfig = require('../src/models/semester-config.model');
const TeachingHours = require('../src/models/teaching-hours.model');
const xlsx = require('xlsx');
const calendarController = require('../src/controllers/calendarController');

describe('calendarController', () => {
  afterEach(() => sinon.restore());

  describe('createCalendar', () => {
    it('should create calendar successfully', async () => {
      const req = {
        user: { id: 'u1' },
        body: { academicYear: '2024-2025', semester: 1, faculty: 'CS', startDate: '2024-10-01', endDate: '2025-02-28', title: 'S1' }
      };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      sinon.stub(Calendar.prototype, 'save').resolves({ _id: 'c1', ...req.body });

      await calendarController.createCalendar(req, res);
      sinon.assert.calledWith(res.status, 201);
      sinon.assert.called(res.json);
    });

    it('should handle validation error', async () => {
      const req = { user: { id: 'u1' }, body: {} };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      sinon.stub(Calendar.prototype, 'save').throws({ name: 'ValidationError', message: 'Invalid' });

      await calendarController.createCalendar(req, res);
      sinon.assert.calledWith(res.status, 400);
    });

    it('should handle server error', async () => {
      const req = { user: { id: 'u1' }, body: {} };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      sinon.stub(Calendar.prototype, 'save').throws(new Error('DB error'));

      await calendarController.createCalendar(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('getCalendars', () => {
    it('should get calendars', async () => {
      sinon.stub(Calendar, 'find').returns({ sort: sinon.stub().resolves([{}]) });
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCalendars({}, res);
      sinon.assert.called(res.json);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'find').throws(new Error('DB error'));
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCalendars({}, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('getCurrentCalendar', () => {
    it('should return current calendar', async () => {
      sinon.stub(Calendar, 'findOne').resolves({});
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCurrentCalendar({}, res);
      sinon.assert.called(res.json);
    });

    it('should return 404 if no calendar', async () => {
      sinon.stub(Calendar, 'findOne').resolves(null);
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCurrentCalendar({}, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findOne').throws(new Error('DB error'));
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCurrentCalendar({}, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('getCalendarById', () => {
    it('should return calendar', async () => {
      sinon.stub(Calendar, 'findById').resolves({});
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCalendarById(req, res);
      sinon.assert.called(res.json);
    });

    it('should return 404', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCalendarById(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.getCalendarById(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('updateCalendar', () => {
    it('should update calendar', async () => {
      sinon.stub(Calendar, 'findByIdAndUpdate').resolves({});
      const req = { params: { id: 'c1' }, user: { id: 'u1' }, body: { title: 'new' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.updateCalendar(req, res);
      sinon.assert.called(res.json);
    });

    it('should return 404', async () => {
      sinon.stub(Calendar, 'findByIdAndUpdate').resolves(null);
      const req = { params: { id: 'c1' }, user: { id: 'u1' }, body: { title: 'new' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.updateCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle validation error', async () => {
      sinon.stub(Calendar, 'findByIdAndUpdate').throws({ name: 'ValidationError', message: 'Invalid' });
      const req = { params: { id: 'c1' }, user: { id: 'u1' }, body: { title: 'new' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.updateCalendar(req, res);
      sinon.assert.calledWith(res.status, 400);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findByIdAndUpdate').throws(new Error('DB error'));
      const req = { params: { id: 'c1' }, user: { id: 'u1' }, body: { title: 'new' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.updateCalendar(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('deleteCalendar', () => {
    it('should delete calendar', async () => {
      sinon.stub(Calendar, 'findByIdAndDelete').resolves({});
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.deleteCalendar(req, res);
      sinon.assert.called(res.json);
    });

    it('should return 404', async () => {
      sinon.stub(Calendar, 'findByIdAndDelete').resolves(null);
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.deleteCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findByIdAndDelete').throws(new Error('DB error'));
      const req = { params: { id: 'c1' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.deleteCalendar(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('importHolidays', () => {
    it('should import without calendarId', async () => {
      const req = { body: { year: 2024 } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      sinon.stub(Calendar, 'importHolidays').resolves([{ date: '2024-12-25', holidayName: 'Craciun' }]);
      await calendarController.importHolidays(req, res);
      sinon.assert.calledWithMatch(res.json, sinon.match.has('importedDays', 1));
    });

    it('should return 400 if year missing', async () => {
      const req = { body: {} };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.importHolidays(req, res);
      sinon.assert.calledWith(res.status, 400);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'importHolidays').throws(new Error('DB error'));
      const req = { body: { year: 2024 } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };
      await calendarController.importHolidays(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('generateCalendar', () => {
    it('should return 404 if calendar not found', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.generateCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should return 404 if no semester config', async () => {
      sinon.stub(Calendar, 'findById').resolves({ _id: '1', academicYear: '2024-2025', semester: 1, faculty: 'CS' });
      sinon.stub(SemesterConfig, 'findOne').resolves(null);
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.generateCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.generateCalendar(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('exportToExcel', () => {
    it('should return 404 if calendar not found', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.exportToExcel(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.exportToExcel(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('verifyCalendar', () => {
    it('should return 404 if calendar not found', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.verifyCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should return 404 if no semester config', async () => {
      sinon.stub(Calendar, 'findById').resolves({ _id: '1', academicYear: '2024-2025', semester: 1, faculty: 'CS', days: [] });
      sinon.stub(SemesterConfig, 'findOne').resolves(null);
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.verifyCalendar(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: '1' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.verifyCalendar(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('addSpecialDays', () => {
    it('should add special days', async () => {
      const calMock = { days: [], save: sinon.stub().resolvesThis() };
      sinon.stub(Calendar, 'findById').resolves(calMock);
      const req = { params: { id: '1' }, body: [{ date: '2024-12-25', holidayName: 'Craciun' }] };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.addSpecialDays(req, res);
      sinon.assert.called(res.json);
    });

    it('should return 404 if calendar not found', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: '1' }, body: [] };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.addSpecialDays(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: '1' }, body: [] };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.addSpecialDays(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('getDayInfo', () => {
    it('should return 400 if date missing', async () => {
      const req = { params: { id: '1' }, query: {} };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.getDayInfo(req, res);
      sinon.assert.calledWith(res.status, 400);
    });

    it('should return 404 if calendar not found', async () => {
      sinon.stub(Calendar, 'findById').resolves(null);
      const req = { params: { id: '1' }, query: { date: '2024-12-25' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.getDayInfo(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should return 404 if day not found', async () => {
      sinon.stub(Calendar, 'findById').resolves({ days: [] });
      const req = { params: { id: '1' }, query: { date: '2024-12-25' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.getDayInfo(req, res);
      sinon.assert.calledWith(res.status, 404);
    });

    it('should handle error', async () => {
      sinon.stub(Calendar, 'findById').throws(new Error('DB error'));
      const req = { params: { id: '1' }, query: { date: '2024-12-25' } };
      const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
      await calendarController.getDayInfo(req, res);
      sinon.assert.calledWith(res.status, 500);
    });
  });

  describe('generateCalendar', () => {
  it('should generate calendar with holidays merged', async () => {
    const req = { params: { id: '1' } };
    const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

    const calendarMock = {
      _id: '1',
      academicYear: '2024-2025',
      semester: 1,
      faculty: 'CS',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-07'),
      days: [
        { date: new Date('2024-10-05'), isHoliday: true, holidayName: 'Ziua 1' }
      ],
      save: sinon.stub().resolvesThis()
    };

    const configMock = {
      weeks: [
        { startDate: '2024-10-01', weekNumber: 1, weekType: 'par' }
      ],
      isMedicine: false
    };

    sinon.stub(Calendar, 'findById').resolves(calendarMock);
    sinon.stub(SemesterConfig, 'findOne').resolves(configMock);
    sinon.stub(TeachingHours, 'find').resolves([]);

    await calendarController.generateCalendar(req, res);

    sinon.assert.calledWithMatch(res.json, sinon.match.has('generated', 7));
  });
});

describe('verifyCalendar', () => {
it('should detect duplicate days and week mismatch', async () => {
  const calendarMock = {
    _id: '1',
    academicYear: '2024-2025',
    semester: 1,
    faculty: 'CS',
    days: [
      { date: '2024-10-01', semesterWeek: 1, oddEven: 'par' },
      { date: '2024-10-01', semesterWeek: 1, oddEven: 'par' }, // duplicate
      { date: '2024-10-02', semesterWeek: 99, oddEven: 'par' } // mismatch
    ]
  };

  const configMock = {
    weeks: [
      { weekNumber: 1, weekType: 'par' },
      { weekNumber: 2, weekType: 'impar' }
    ]
  };

  sinon.stub(Calendar, 'findById').resolves(calendarMock);
  sinon.stub(SemesterConfig, 'findOne').resolves(configMock);

  const req = { params: { id: '1' } };
  const res = {
    status: sinon.stub().returnsThis(),
    json: sinon.spy()
  };

  await calendarController.verifyCalendar(req, res);

  // Assert that the status code is 400 for invalid calendar verification errors
  sinon.assert.calledWith(res.status, 400);

  // Assert that the response JSON contains the expected error structure
  sinon.assert.calledWith(res.json, sinon.match({
    error: sinon.match.string,
    details: sinon.match.array
  }));
});



});

describe('exportToExcel', () => {
  it('should send excel file', async () => {
    const req = { params: { id: '1' } };
    const res = {
      header: sinon.stub().returnsThis(),
      send: sinon.spy(),
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };

    const calendarMock = {
      _id: '1',
      days: [
        { date: new Date('2024-10-01'), dayOfWeek: 'Luni', isWorkingDay: true, oddEven: 'par', semesterWeek: 1, isHoliday: false, holidayName: '' }
      ]
    };

    sinon.stub(Calendar, 'findById').resolves(calendarMock);

    await calendarController.exportToExcel(req, res);

    sinon.assert.calledOnce(res.send);
    sinon.assert.calledWithMatch(res.header, sinon.match.string, sinon.match.string);
  });
});

});


