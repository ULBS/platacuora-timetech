const sinon = require('sinon');
const TeachingHours = require('../src/models/teaching-hours.model');
const Calendar = require('../src/models/calendar.model');
const controller = require('../src/controllers/teachingHoursController');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

describe('teachingHoursController', () => {
  let res;

  beforeEach(() => {
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      setHeader: sinon.stub(),
      send: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create a teaching hours record', async () => {
    const req = {
      user: { id: 'user123' },
      body: {
        faculty: 'CS',
        department: 'Informatica',
        academicYear: '2024-2025',
        semester: 1,
        postNumber: 1,
        postGrade: 'lector',
        disciplineName: 'PWEB',
        activityType: 'Curs',
        group: '321A',
        dayOfWeek: 'Luni',
        courseHours: 2
      }
    };

    sinon.stub(TeachingHours, 'isRecordDuplicate').resolves(false);
    sinon.stub(TeachingHours.prototype, 'save').resolvesThis();

    await controller.createTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 201);
    sinon.assert.calledOnce(res.json);
  });

  it('should get teaching hours records with pagination', async () => {
    const req = {
      user: { id: 'user123' },
      query: { page: 1, limit: 10 }
    };

    sinon.stub(TeachingHours, 'countDocuments').resolves(1);
    sinon.stub(TeachingHours, 'find').returns({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              populate: () => Promise.resolve([{ _id: 'mockId' }])
            })
          })
        })
      })
    });

    await controller.getTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should get a single teaching hour record', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      params: { id: 'mockId' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      _id: 'mockId',
      user: { _id: 'user123' }
    });

    await controller.getTeachingHoursById(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should update a teaching hour record', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      params: { id: 'mockId' },
      body: { notes: 'Updated note' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      user: 'user123',
      status: 'verificat',
      save: sinon.stub().resolvesThis()
    });

    await controller.updateTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should delete a teaching hour record', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      params: { id: 'mockId' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      user: 'user123',
      processedInDeclaration: false,
      deleteOne: sinon.stub().resolves()
    });

    await controller.deleteTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 200);
    sinon.assert.calledOnce(res.json);
  });

  it('should verify a teaching hour record', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      params: { id: 'mockId' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      save: sinon.stub().resolvesThis()
    });

    await controller.verifyTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should reject a teaching hour record', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      params: { id: 'mockId' },
      body: { rejectionReason: 'Invalid data' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      save: sinon.stub().resolvesThis()
    });

    await controller.rejectTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should get teaching hours statistics', async () => {
    const req = {
      user: { id: 'user123' },
      query: {}
    };

    sinon.stub(TeachingHours, 'getHoursSummary').resolves([{
      totalCourseHours: 10
    }]);

    await controller.getStatistics(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should validate teaching hours against calendar', async () => {
    const req = {
      user: { id: 'user123' },
      body: { academicYear: '2024-2025', semester: 1 }
    };

    sinon.stub(Calendar, 'findOne').resolves({ _id: 'cal123' });
    sinon.stub(TeachingHours, 'find').resolves([{
      _id: 'mockId',
      disciplineName: 'PWEB',
      dayOfWeek: 'Luni',
      oddEven: 'Par',
      isSpecial: false,
      specialWeek: null,
      validateAgainstCalendar: sinon.stub().resolves({ valid: true })
    }]);

    await controller.validateTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should bulk verify teaching hours', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      body: { ids: ['mockId'], action: 'verify' }
    };

    sinon.stub(TeachingHours, 'updateMany').resolves({
      matchedCount: 1,
      modifiedCount: 1
    });

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

  it('should bulk reject teaching hours', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      body: { ids: ['mockId'], action: 'reject', rejectionReason: 'Test reason' }
    };

    sinon.stub(TeachingHours, 'updateMany').resolves({
      matchedCount: 1,
      modifiedCount: 1
    });

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledOnce(res.json);
  });

    it('should return 409 if record is duplicate on create', async () => {
    const req = {
      user: { id: 'user123' },
      body: {
        faculty: 'CS',
        department: 'Informatica',
        academicYear: '2024-2025',
        semester: 1,
        postNumber: 1,
        postGrade: 'lector',
        disciplineName: 'PWEB',
        activityType: 'Curs',
        group: '321A',
        dayOfWeek: 'Luni',
        courseHours: 2
      }
    };

    sinon.stub(TeachingHours, 'isRecordDuplicate').resolves(true);

    await controller.createTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 409);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if multiple hour types specified on create', async () => {
    const req = {
      user: { id: 'user123' },
      body: {
        faculty: 'CS',
        department: 'Informatica',
        academicYear: '2024-2025',
        semester: 1,
        postNumber: 1,
        postGrade: 'lector',
        disciplineName: 'PWEB',
        activityType: 'Curs',
        group: '321A',
        dayOfWeek: 'Luni',
        courseHours: 2,
        seminarHours: 2
      }
    };

    sinon.stub(TeachingHours, 'isRecordDuplicate').resolves(false);

    await controller.createTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 403 if non-owner tries to update', async () => {
    const req = {
      user: { id: 'user123', role: 'user' },
      params: { id: 'mockId' },
      body: { notes: 'test' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      user: 'otherUser'
    });

    await controller.updateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 403);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if processed record is updated', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      params: { id: 'mockId' },
      body: { notes: 'test' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      user: 'user123',
      processedInDeclaration: true
    });

    await controller.updateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 404 if delete target not found', async () => {
    const req = {
      user: { id: 'user123', role: 'admin' },
      params: { id: 'mockId' }
    };

    sinon.stub(TeachingHours, 'findById').resolves(null);

    await controller.deleteTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 403 if non-owner tries to delete', async () => {
    const req = {
      user: { id: 'user123', role: 'user' },
      params: { id: 'mockId' }
    };

    sinon.stub(TeachingHours, 'findById').resolves({
      user: 'otherUser',
      processedInDeclaration: false
    });

    await controller.deleteTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 403);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if bulk update missing ids', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      body: { action: 'verify' }
    };

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if bulk update action invalid', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      body: { ids: ['mockId'], action: 'invalid' }
    };

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if bulk reject missing rejectionReason', async () => {
    const req = {
      user: { id: 'adminId', role: 'admin' },
      body: { ids: ['mockId'], action: 'reject' }
    };

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 403 if bulk update by unauthorized role', async () => {
    const req = {
      user: { id: 'user123', role: 'user' },
      body: { ids: ['mockId'], action: 'verify' }
    };

    await controller.bulkUpdateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 403);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 400 if validateTeachingHours missing fields', async () => {
    const req = {
      user: { id: 'user123' },
      body: {}
    };

    await controller.validateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
  });

  it('should return 404 if validateTeachingHours calendar not found', async () => {
    const req = {
      user: { id: 'user123' },
      body: { academicYear: '2024-2025', semester: 1 }
    };

    sinon.stub(Calendar, 'findOne').resolves(null);

    await controller.validateTeachingHours(req, res);

    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledOnce(res.json);
  });
it('should export teaching hours to Excel', async () => {
  const req = { user: { id: 'user123' }, query: {} };

  sinon.stub(TeachingHours, 'find').returns({
    sort: () => ({
      populate: () => ({
        populate: () => Promise.resolve([])
      })
    })
  });
  sinon.stub(TeachingHours, 'formatForExport').returns([]);

  await controller.exportToExcel(req, res);

  sinon.assert.called(res.setHeader);
  sinon.assert.called(res.send);
});
it('should handle error in exportToExcel', async () => {
  const req = { user: { id: 'user123' }, query: {} };

  sinon.stub(TeachingHours, 'find').throws(new Error('DB error'));

  await controller.exportToExcel(req, res);

  sinon.assert.calledWith(res.status, 500);
  sinon.assert.calledOnce(res.json);
});
it('should return 400 if no file provided in importFromExcel', async () => {
  const req = { user: { id: 'user123' }, file: null };

  await controller.importFromExcel(req, res);

  sinon.assert.calledWith(res.status, 400);
  sinon.assert.calledOnce(res.json);
});
it('should return 400 if importFromExcel parseImportData returns errors', async () => {
  const req = { user: { id: 'user123' }, file: { buffer: Buffer.from('') } };

  sinon.stub(xlsx, 'read').returns({ Sheets: { Sheet1: {} }, SheetNames: ['Sheet1'] });
  sinon.stub(xlsx.utils, 'sheet_to_json').returns([]);
  sinon.stub(TeachingHours, 'parseImportData').returns({ parsedData: [], errors: ['Invalid'] });

  await controller.importFromExcel(req, res);

  sinon.assert.calledWith(res.status, 400);
  sinon.assert.calledOnce(res.json);
});
it('should import teaching hours successfully', async () => {
  const req = { user: { id: 'user123' }, file: { buffer: Buffer.from('') } };

  sinon.stub(xlsx, 'read').returns({ Sheets: { Sheet1: {} }, SheetNames: ['Sheet1'] });
  sinon.stub(xlsx.utils, 'sheet_to_json').returns([]);
  sinon.stub(TeachingHours, 'parseImportData').returns({ parsedData: [{}], errors: [] });

  const sessionMock = {
    startTransaction: sinon.stub(),
    commitTransaction: sinon.stub(),
    abortTransaction: sinon.stub(),
    endSession: sinon.stub()
  };
  sinon.stub(mongoose, 'startSession').resolves(sessionMock);
  sinon.stub(TeachingHours, 'isRecordDuplicate').resolves(false);
  sinon.stub(TeachingHours.prototype, 'save').resolves();

  await controller.importFromExcel(req, res);

  sinon.assert.calledOnce(res.json);
});

it('should return 404 if teaching hour not found by id', async () => {
  const req = { user: { id: 'user123', role: 'admin' }, params: { id: 'mockId' } };

  sinon.stub(TeachingHours, 'findById').returns({
    populate: () => ({
      populate: () => ({
        populate: () => Promise.resolve(null)
      })
    })
  });

  await controller.getTeachingHoursById(req, res);

  sinon.assert.calledWith(res.status, 404);
  sinon.assert.calledOnce(res.json);
});

it('should return 403 if not owner and not admin in getTeachingHoursById', async () => {
  const req = { user: { id: 'user123', role: 'user' }, params: { id: 'mockId' } };

  sinon.stub(TeachingHours, 'findById').returns({
    populate: () => ({
      populate: () => ({
        populate: () => Promise.resolve({
          user: { _id: 'otherUser' }
        })
      })
    })
  });

  await controller.getTeachingHoursById(req, res);

  sinon.assert.calledWith(res.status, 403);
  sinon.assert.calledOnce(res.json);
});

it('should return 403 if unauthorized verifyTeachingHours', async () => {
  const req = { user: { id: 'user123', role: 'user' }, params: { id: 'mockId' } };

  sinon.stub(TeachingHours, 'findById').resolves({});

  await controller.verifyTeachingHours(req, res);

  sinon.assert.calledWith(res.status, 403);
  sinon.assert.calledOnce(res.json);
});
it('should return 403 if unauthorized rejectTeachingHours', async () => {
  const req = { user: { id: 'user123', role: 'user' }, params: { id: 'mockId' }, body: { rejectionReason: 'Test' } };

  sinon.stub(TeachingHours, 'findById').resolves({});

  await controller.rejectTeachingHours(req, res);

  sinon.assert.calledWith(res.status, 403);
  sinon.assert.calledOnce(res.json);
});

});
