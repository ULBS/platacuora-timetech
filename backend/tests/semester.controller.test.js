const sinon = require('sinon');
const SemesterConfig = require('../src/models/semester-config.model');
const controller = require('../src/controllers/semesterConfigController');
const Calendar = require('../src/models/calendar.model');


describe('semesterConfigController', () => {
  let res;

  beforeEach(() => {
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create a semester config', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      body: {
        academicYear: '2024-2025',
        semester: 1,
        faculty: 'CS',
        startDate: '2024-10-01',
        endDate: '2025-02-01'
      }
    };

    sinon.stub(SemesterConfig, 'findOne').resolves(null);
    sinon.stub(SemesterConfig.prototype, 'save').callsFake(function () {
      this._id = this._id || 'mockId';
      return Promise.resolve(this);
    });

    await controller.createSemesterConfig(req, res);

    sinon.assert.calledWith(res.status, 201);
    const result = res.json.firstCall.args[0];
    expect(result).toHaveProperty('_id');
  });

  it('should return 409 if config already exists', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      body: {
        academicYear: '2024-2025',
        semester: 1,
        faculty: 'CS',
        startDate: '2024-10-01',
        endDate: '2025-02-01'
      }
    };

    sinon.stub(SemesterConfig, 'findOne').resolves({ _id: 'existing' });

    await controller.createSemesterConfig(req, res);

    sinon.assert.calledWith(res.status, 409);
    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/există/i);
  });

  it('should get semester configs', async () => {
  const req = { query: {}, user: { id: 'admin', role: 'admin' } };

  sinon.stub(SemesterConfig, 'find').returns({
    sort: () => ({
      populate: () => Promise.resolve([{ _id: 'mockId' }])
    })
  });

  await controller.getSemesterConfigs(req, res);

  const result = res.json.firstCall.args[0];
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);
  expect(result[0]).toHaveProperty('_id');
});

  it('should get semester config by ID', async () => {
    const req = { params: { id: 'mockId' }, user: { id: 'admin', role: 'admin' } };

sinon.stub(SemesterConfig, 'findById').returns({
  populate: () => Promise.resolve({ _id: 'mockId' })
});

    await controller.getSemesterConfigById(req, res);

    const result = res.json.firstCall.args[0];
    expect(result).toHaveProperty('_id');
  });

  it('should return 404 if semester config by ID not found', async () => {
    const req = { params: { id: 'mockId' }, user: { id: 'admin', role: 'admin' } };

sinon.stub(SemesterConfig, 'findById').returns({
  populate: () => Promise.resolve(null)
});


    await controller.getSemesterConfigById(req, res);

    sinon.assert.calledWith(res.status, 404);
    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/negăsită/i);
  });

  it('should update semester config', async () => {
    const req = {
      params: { id: 'mockId' },
      body: { academicYear: '2025-2026' },
      user: { id: 'admin', role: 'admin' }
    };

    const saveStub = sinon.stub().resolves({ _id: 'mockId', academicYear: '2025-2026' });

    sinon.stub(SemesterConfig, 'findById').resolves({
      academicYear: '2024-2025',
      save: saveStub
    });

    await controller.updateSemesterConfig(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.academicYear).toBe('2025-2026');
  });

  it('should delete semester config', async () => {
    const req = { params: { id: 'mockId' } };
    sinon.stub(SemesterConfig, 'findByIdAndDelete').resolves({ _id: 'mockId' });

    await controller.deleteSemesterConfig(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/ștearsă/i);
  });

  it('should return 404 when deleting nonexistent config', async () => {
    const req = { params: { id: 'mockId' }, user: { id: 'admin', role: 'admin' } };
    sinon.stub(SemesterConfig, 'findByIdAndDelete').resolves(null);

    await controller.deleteSemesterConfig(req, res);

    sinon.assert.calledWith(res.status, 404);
    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/negăsită/i);
  });

  it('should activate semester config', async () => {
    const req = { params: { id: 'mockId' }, user: { id: 'admin', role: 'admin' } };

    const saveStub = sinon.stub().resolves({ _id: 'mockId', status: 'active' });

    sinon.stub(SemesterConfig, 'findById').resolves({
      _id: 'mockId',
      faculty: 'CS',
      academicYear: '2024-2025',
      semester: 1,
      save: saveStub
    });

    sinon.stub(SemesterConfig, 'updateMany').resolves();

    await controller.activateSemesterConfig(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/activată/i);
  });

  it('should return 404 if config to activate not found', async () => {
    const req = { params: { id: 'mockId' }, user: { id: 'admin', role: 'admin' } };
    sinon.stub(SemesterConfig, 'findById').resolves(null);

    await controller.activateSemesterConfig(req, res);

    sinon.assert.calledWith(res.status, 404);
    const result = res.json.firstCall.args[0];
    expect(result.message).toMatch(/negăsită/i);
  });

  describe('additional coverage', () => {
  afterEach(() => sinon.restore());

  it('should get current semester config', async () => {
    const req = { query: { faculty: 'CS' } };
    sinon.stub(SemesterConfig, 'findOne').returns({
      populate: () => Promise.resolve({ _id: 'mockId' })
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.getCurrentSemesterConfig(req, res);

    sinon.assert.called(res.json);
  });

  it('should return 404 if no current semester config', async () => {
    const req = { query: { faculty: 'CS' } };
    sinon.stub(SemesterConfig, 'findOne').returns({
      populate: () => Promise.resolve(null)
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.getCurrentSemesterConfig(req, res);

    sinon.assert.calledWith(res.status, 404);
  });

  it('should get semester configs by faculty', async () => {
    const req = { params: { faculty: 'CS' }, query: {} };
    sinon.stub(SemesterConfig, 'find').returns({
      sort: () => ({
        populate: () => Promise.resolve([{ _id: 'mockId' }])
      })
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.getSemesterConfigsByFaculty(req, res);

    sinon.assert.called(res.json);
  });

  it('should generate weeks', async () => {
    const req = { params: { id: 'mockId' }, body: {} };
    sinon.stub(SemesterConfig, 'findById').resolves({
      _id: 'mockId',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-31'),
      isMedicine: false,
      save: sinon.stub().resolvesThis(),
      weeks: [],
      specialWeeks: []
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.generateWeeks(req, res);

    sinon.assert.called(res.json);
  });

  it('should return 404 when generating weeks if config not found', async () => {
    const req = { params: { id: 'mockId' }, body: {} };
    sinon.stub(SemesterConfig, 'findById').resolves(null);

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.generateWeeks(req, res);

    sinon.assert.calledWith(res.status, 404);
  });

  it('should get week info', async () => {
    const req = { params: { id: 'mockId' }, query: { date: '2024-10-01' } };
    sinon.stub(SemesterConfig, 'findById').resolves({
      _id: 'mockId',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-31'),
      isMedicine: false,
      weeks: [
        {
          weekNumber: 'S01',
          weekType: 'Par',
          startDate: new Date('2024-10-01')
        }
      ],
      specialWeeks: []
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.getWeekInfo(req, res);

    sinon.assert.called(res.json);
  });

  it('should return 400 if date missing in getWeekInfo', async () => {
    const req = { params: { id: 'mockId' }, query: {} };

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.getWeekInfo(req, res);

    sinon.assert.calledWith(res.status, 400);
  });

  it('should validate against calendar', async () => {
    const req = { params: { id: 'mockId' } };

    sinon.stub(SemesterConfig, 'findById').resolves({
      _id: 'mockId',
      academicYear: '2024-2025',
      semester: 1,
      faculty: 'CS',
      weeks: [
        { weekNumber: 'S01', startDate: new Date('2024-10-01'), weekType: 'Par' }
      ],
      specialWeeks: [],
      isMedicine: false
    });

    sinon.stub(Calendar, 'findOne').resolves({
      days: [
        { date: new Date('2024-10-01'), oddEven: 'Par' }
      ]
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.validateAgainstCalendar(req, res);

    sinon.assert.called(res.json);
  });

  it('should return 404 in validateAgainstCalendar if config not found', async () => {
    const req = { params: { id: 'mockId' } };
    sinon.stub(SemesterConfig, 'findById').resolves(null);

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.validateAgainstCalendar(req, res);

    sinon.assert.calledWith(res.status, 404);
  });

  it('should return 404 in validateAgainstCalendar if calendar not found', async () => {
    const req = { params: { id: 'mockId' } };

    sinon.stub(SemesterConfig, 'findById').resolves({
      _id: 'mockId',
      academicYear: '2024-2025',
      semester: 1,
      faculty: 'CS',
      weeks: [],
      specialWeeks: [],
      isMedicine: false
    });

    sinon.stub(Calendar, 'findOne').resolves(null);

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.validateAgainstCalendar(req, res);

    sinon.assert.calledWith(res.status, 404);
  });

  it('should add vacation period', async () => {
    const req = { 
      params: { id: 'mockId' },
      body: { name: 'Vacanta', startDate: '2024-12-20', endDate: '2024-12-31' }
    };

    sinon.stub(SemesterConfig, 'findById').resolves({
      specialWeeks: [],
      save: sinon.stub().resolvesThis()
    });

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.addVacationPeriod(req, res);

    sinon.assert.called(res.json);
  });

  it('should return 400 if missing fields in addVacationPeriod', async () => {
    const req = { params: { id: 'mockId' }, body: {} };

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.addVacationPeriod(req, res);

    sinon.assert.calledWith(res.status, 400);
  });

  it('should return 404 if config not found in addVacationPeriod', async () => {
    const req = { 
      params: { id: 'mockId' },
      body: { name: 'Vacanta', startDate: '2024-12-20', endDate: '2024-12-31' }
    };

    sinon.stub(SemesterConfig, 'findById').resolves(null);

    const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
    await controller.addVacationPeriod(req, res);

    sinon.assert.calledWith(res.status, 404);
  });

  it('should generate weeks including special weeks for medicine', async () => {
  const req = { params: { id: 'mockId' }, body: { oddWeekStart: true } };

  const saveStub = sinon.stub().resolves();
  sinon.stub(SemesterConfig, 'findById').resolves({
    _id: 'mockId',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    isMedicine: true,
    specialWeeks: [],
    save: saveStub
  });

  await controller.generateWeeks(req, res);
  sinon.assert.called(res.json);
  const result = res.json.firstCall.args[0];
  expect(result.specialWeeks).toBeGreaterThan(0);
});
it('should return 400 if date is outside semester range in getWeekInfo', async () => {
  const req = { params: { id: 'mockId' }, query: { date: '2030-01-01' } };

  sinon.stub(SemesterConfig, 'findById').resolves({
    startDate: new Date('2024-10-01'),
    endDate: new Date('2025-02-01')
  });

  await controller.getWeekInfo(req, res);
  sinon.assert.calledWith(res.status, 400);
});
it('should detect week type mismatch in validateAgainstCalendar', async () => {
  const req = { params: { id: 'mockId' } };

  sinon.stub(SemesterConfig, 'findById').resolves({
    academicYear: '2024-2025',
    semester: 1,
    faculty: 'CS',
    weeks: [
      { weekNumber: 'S01', startDate: '2024-10-01', weekType: 'Par' }
    ],
    isMedicine: false
  });

  sinon.stub(Calendar, 'findOne').resolves({
    days: [
      { date: '2024-10-01', oddEven: 'Impar' }
    ]
  });

  await controller.validateAgainstCalendar(req, res);
  sinon.assert.called(res.json);
  const result = res.json.firstCall.args[0];
  expect(result.isValid).toBe(false);
});
it('should add vacation period with custom type', async () => {
  const req = { 
    params: { id: 'mockId' },
    body: { name: 'Concediu medical', startDate: '2024-12-01', endDate: '2024-12-07', type: 'medical' }
  };

  const saveStub = sinon.stub().resolves();
  sinon.stub(SemesterConfig, 'findById').resolves({
    specialWeeks: [],
    save: saveStub
  });

  await controller.addVacationPeriod(req, res);
  sinon.assert.called(res.json);
});
it('should handle server error when creating semester config', async () => {
  const req = {
    user: { id: 'user123', role: 'admin' },
    body: {
      academicYear: '2024-2025',
      semester: 1,
      faculty: 'CS',
      startDate: '2024-10-01',
      endDate: '2025-02-01'
    }
  };

  sinon.stub(SemesterConfig, 'findOne').throws(new Error('DB error'));

  await controller.createSemesterConfig(req, res);

  sinon.assert.calledWith(res.status, 500);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/server/i);
});
it('should handle validation error when updating semester config', async () => {
  const req = {
    params: { id: 'mockId' },
    body: { academicYear: 'invalid' }
  };

  const saveStub = sinon.stub().throws({ name: 'ValidationError', message: 'Invalid data' });

  sinon.stub(SemesterConfig, 'findById').resolves({
    academicYear: '2024-2025',
    save: saveStub
  });

  await controller.updateSemesterConfig(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/invalid/i);
});
it('should handle duplicate key error when updating semester config', async () => {
  const req = {
    params: { id: 'mockId' },
    body: { academicYear: '2025-2026' }
  };

  const saveStub = sinon.stub().throws({ code: 11000 });

  sinon.stub(SemesterConfig, 'findById').resolves({
    academicYear: '2024-2025',
    save: saveStub
  });

  await controller.updateSemesterConfig(req, res);

  sinon.assert.calledWith(res.status, 409);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/există/i);
});
it('should handle server error on deleteSemesterConfig', async () => {
  const req = { params: { id: 'mockId' } };

  sinon.stub(SemesterConfig, 'findByIdAndDelete').throws(new Error('DB error'));

  await controller.deleteSemesterConfig(req, res);

  sinon.assert.calledWith(res.status, 500);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/server/i);
});
it('should handle server error on activateSemesterConfig', async () => {
  const req = { params: { id: 'mockId' } };

  sinon.stub(SemesterConfig, 'findById').throws(new Error('DB error'));

  await controller.activateSemesterConfig(req, res);

  sinon.assert.calledWith(res.status, 500);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/server/i);
});
it('should handle server error on generateWeeks', async () => {
  const req = { params: { id: 'mockId' }, body: {} };

  sinon.stub(SemesterConfig, 'findById').throws(new Error('DB error'));

  await controller.generateWeeks(req, res);

  sinon.assert.calledWith(res.status, 500);
  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/server/i);
});
it('should get semester configs with filters', async () => {
  const req = { query: { faculty: 'CS', semester: '1', academicYear: '2024-2025', status: 'active' } };

  sinon.stub(SemesterConfig, 'find').returns({
    sort: () => ({
      populate: () => Promise.resolve([{ _id: 'mockId', faculty: 'CS' }])
    })
  });

  await controller.getSemesterConfigs(req, res);

  const result = res.json.firstCall.args[0];
  expect(Array.isArray(result)).toBe(true);
  expect(result[0]).toHaveProperty('faculty', 'CS');
});
it('should get semester configs by faculty with query filters', async () => {
  const req = { params: { faculty: 'CS' }, query: { academicYear: '2024-2025', semester: '1', status: 'active' } };

  sinon.stub(SemesterConfig, 'find').returns({
    sort: () => ({
      populate: () => Promise.resolve([{ _id: 'mockId', faculty: 'CS' }])
    })
  });

  await controller.getSemesterConfigsByFaculty(req, res);

  const result = res.json.firstCall.args[0];
  expect(Array.isArray(result)).toBe(true);
  expect(result[0]).toHaveProperty('faculty', 'CS');
});
it('should generate weeks with oddWeekStart = false', async () => {
  const req = { params: { id: 'mockId' }, body: { oddWeekStart: false } };

sinon.stub(SemesterConfig, 'findById').resolves({
  _id: 'mockId',
  startDate: new Date('2024-10-01'),
  endDate: new Date('2024-10-31'),
  isMedicine: false,
  weeks: [],
  specialWeeks: [],
  save: sinon.stub().resolvesThis()
});


  await controller.generateWeeks(req, res);

  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/generate/i);
});
it('should add vacation period with full fields and custom type', async () => {
  const req = {
    params: { id: 'mockId' },
    body: {
      name: 'Vacanță Paște',
      startDate: '2025-04-01',
      endDate: '2025-04-07',
      type: 'special'
    }
  };

  const saveStub = sinon.stub().resolvesThis();

  sinon.stub(SemesterConfig, 'findById').resolves({
    specialWeeks: [],
    save: saveStub
  });

  await controller.addVacationPeriod(req, res);

  const result = res.json.firstCall.args[0];
  expect(result.message).toMatch(/adăugată/i);
});
it('should get current semester config filtered by faculty', async () => {
  const req = { query: { faculty: 'CS' } };

  sinon.stub(SemesterConfig, 'findOne').returns({
    populate: () => Promise.resolve({ _id: 'mockId', faculty: 'CS' })
  });

  await controller.getCurrentSemesterConfig(req, res);

  const result = res.json.firstCall.args[0];
  expect(result).toHaveProperty('faculty', 'CS');
});

});

});
