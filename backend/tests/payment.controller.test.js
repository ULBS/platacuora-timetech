const sinon = require('sinon');
const PaymentDeclaration = require('../src/models/payment-declaration.model');
const TeachingHours = require('../src/models/teaching-hours.model');
const paymentController = require('../src/controllers/paymentDeclarationController');

describe('paymentDeclarationController', () => {
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

     it('should create a payment declaration', async () => {
    const req = {
      user: { id: 'user123' },
      body: {
        title: 'Test',
        semesterId: 'sem1',
        startDate: '2024-10-01',
        endDate: '2024-12-01',
        teachingHourIds: ['th1'],
        hourlyRate: 100
      }
    };

    sinon.stub(TeachingHours, 'find').resolves([{ _id: 'th1', hourCount: 10 }]);
    sinon.stub(PaymentDeclaration.prototype, 'save').callsFake(function () {
      this._id = 'someGeneratedId';
      return Promise.resolve(this);
    });

    await paymentController.createPaymentDeclaration(req, res);

    sinon.assert.calledWith(res.status, 201);
    const result = res.json.firstCall.args[0];
    expect(result).toHaveProperty('_id');
  });

 it('should get payment declarations', async () => {
  const req = { user: { id: 'user123' }, query: {} };

  sinon.stub(PaymentDeclaration, 'find').returns({
    sort: () => ({
      populate: () => ({
        populate: () => Promise.resolve([{ _id: 'pay123' }])
      })
    })
  });

  await paymentController.getPaymentDeclarations(req, res);

  const result = res.json.firstCall.args[0];
  expect(Array.isArray(result)).toBe(true);
  expect(result).toEqual(expect.arrayContaining([
    expect.objectContaining({ _id: 'pay123' })
  ]));
});


  it('should get payment declaration by ID if owner', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'user123', role: 'user' } };

    sinon.stub(PaymentDeclaration, 'findById').returns({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve({
            _id: 'pay123',
            userId: { toString: () => 'user123' }
          })
        })
      })
    });

    await paymentController.getPaymentDeclarationById(req, res);

    const result = res.json.firstCall.args[0];
    expect(result).toHaveProperty('_id', 'pay123');
  });

  it('should return 403 if not owner and not admin', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'user123', role: 'user' } };

    sinon.stub(PaymentDeclaration, 'findById').returns({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve({
            _id: 'pay123',
            userId: { toString: () => 'otherUser' }
          })
        })
      })
    });

    await paymentController.getPaymentDeclarationById(req, res);

    sinon.assert.calledWith(res.status, 403);
    const result = res.json.firstCall.args[0];
    expect(result.message).toBe('Acces interzis');
  });

  it('should return 404 if declaration not found', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'user123', role: 'user' } };

    sinon.stub(PaymentDeclaration, 'findById').returns({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(null)
        })
      })
    });

    await paymentController.getPaymentDeclarationById(req, res);

    sinon.assert.calledWith(res.status, 404);
    const result = res.json.firstCall.args[0];
    expect(result.message).toBe('Declarație de plată negăsită');
  });

  it('should delete payment declaration', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'user123' } };

    sinon.stub(PaymentDeclaration, 'findById').resolves({
      _id: 'pay123',
      userId: { toString: () => 'user123' },
      status: 'draft',
      deleteOne: sinon.stub().resolves()
    });

    await paymentController.deletePaymentDeclaration(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.message).toBe('Declarație ștearsă cu succes');
  });

  it('should submit payment declaration', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'user123' } };

    sinon.stub(PaymentDeclaration, 'findById').resolves({
      _id: 'pay123',
      userId: { toString: () => 'user123' },
      status: 'draft',
      save: sinon.stub().resolvesThis()
    });

    await paymentController.submitPaymentDeclaration(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.status).toBe('pending');
  });

  it('should approve payment declaration', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'admin123' } };

    sinon.stub(PaymentDeclaration, 'findById').resolves({
      _id: 'pay123',
      status: 'pending',
      save: sinon.stub().resolvesThis()
    });

    await paymentController.approvePaymentDeclaration(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.status).toBe('approved');
  });

  it('should reject payment declaration', async () => {
    const req = { params: { id: 'pay123' }, user: { id: 'admin123' }, body: { rejectionReason: 'Incomplete' } };

    sinon.stub(PaymentDeclaration, 'findById').resolves({
      _id: 'pay123',
      status: 'pending',
      save: sinon.stub().resolvesThis()
    });

    await paymentController.rejectPaymentDeclaration(req, res);

    const result = res.json.firstCall.args[0];
    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBe('Incomplete');
  });

  it('should return 400 if no teachingHourIds provided', async () => {
  const req = {
    user: { id: 'user123' },
    body: {
      title: 'Test',
      semesterId: 'sem1',
      startDate: '2024-10-01',
      endDate: '2024-12-01',
      hourlyRate: 100
    }
  };

  await paymentController.createPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Trebuie să selectați cel puțin o înregistrare de ore predate');
});
it('should return 400 if some teachingHourIds are invalid', async () => {
  const req = {
    user: { id: 'user123' },
    body: {
      title: 'Test',
      semesterId: 'sem1',
      startDate: '2024-10-01',
      endDate: '2024-12-01',
      teachingHourIds: ['th1', 'th2'],
      hourlyRate: 100
    }
  };

  sinon.stub(TeachingHours, 'find').resolves([{ _id: 'th1', hourCount: 10 }]);

  await paymentController.createPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Unele înregistrări de ore predate nu sunt valide');
});
it('should return 403 if user tries to update not owned declaration', async () => {
  const req = {
    params: { id: 'pay123' },
    user: { id: 'user123' },
    body: {}
  };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'otherUser' },
    status: 'draft'
  });

  await paymentController.updatePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 403);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Acces interzis');
});
it('should return 400 if update attempted on non-draft declaration', async () => {
  const req = {
    params: { id: 'pay123' },
    user: { id: 'user123' },
    body: {}
  };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'user123' },
    status: 'approved'
  });

  await paymentController.updatePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Nu puteți modifica declarația în stadiul curent');
});

it('should return 403 if user tries to generate PDF for another user', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123', role: 'user' } };

  sinon.stub(PaymentDeclaration, 'findById').returns({
    populate: () => ({
      populate: () => ({
        populate: () => Promise.resolve({
          _id: 'pay123',
          userId: {
            _id: { toString: () => 'otherUser' },
            toString: () => 'otherUser'
          },
          generatePDF: sinon.stub().resolves({ pdfUrl: 'some-url' })
        })
      })
    })
  });

  await paymentController.generatePDF(req, res);

  sinon.assert.calledWith(res.status, 403);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Acces interzis');
});


it('should generate PDF successfully', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123', role: 'user' } };

  sinon.stub(PaymentDeclaration, 'findById').returns({
    populate: () => ({
      populate: () => ({
        populate: () => Promise.resolve({
          _id: 'pay123',
          userId: {
            _id: { toString: () => 'user123' },
            toString: () => 'user123'
          },
          generatePDF: sinon.stub().resolves({ pdfUrl: 'some-url' })
        })
      })
    })
  });

  await paymentController.generatePDF(req, res);

  const result = res.json.firstCall.args[0];
  expect(result.pdfUrl).toBe('some-url');
});

it('should admin get payment declarations', async () => {
  const req = { query: {} };

  sinon.stub(PaymentDeclaration, 'find').returns({
    sort: () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve([{ _id: 'payAdmin' }])
        })
      })
    })
  });

  await paymentController.adminGetPaymentDeclarations(req, res);

  const result = res.json.firstCall.args[0];
  expect(Array.isArray(result)).toBe(true);
  expect(result[0]).toHaveProperty('_id', 'payAdmin');
});


it('should update payment declaration with teachingHourIds', async () => {
  const req = {
    params: { id: 'pay123' },
    user: { id: 'user123' },
    body: {
      title: 'Updated',
      teachingHourIds: ['th1'],
      hourlyRate: 100
    }
  };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'user123' },
    status: 'draft',
    save: sinon.stub().resolvesThis()
  });

  sinon.stub(TeachingHours, 'find').resolves([{ _id: 'th1', hourCount: 5 }]);

  await paymentController.updatePaymentDeclaration(req, res);

  const result = res.json.firstCall.args[0];
  expect(result).toHaveProperty('_id', 'pay123');
});

it('should return 400 if invalid teaching hours in update', async () => {
  const req = {
    params: { id: 'pay123' },
    user: { id: 'user123' },
    body: { teachingHourIds: ['th1', 'th2'] }
  };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'user123' },
    status: 'draft'
  });

  sinon.stub(TeachingHours, 'find').resolves([{ _id: 'th1', hourCount: 5 }]);

  await paymentController.updatePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Ore predate invalide');
});

it('should return 400 if delete non-draft declaration', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'user123' },
    status: 'approved'
  });

  await paymentController.deletePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Nu puteți șterge declarația în stadiul curent');
});

it('should return 404 on delete if not found', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves(null);

  await paymentController.deletePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 404);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarație de plată negăsită');
});

it('should return 400 if submit non-draft', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    userId: { toString: () => 'user123' },
    status: 'approved'
  });

  await paymentController.submitPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarația nu poate fi trimisă în stadiul curent');
});

it('should return 404 if submit not found', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'user123' } };
  sinon.stub(PaymentDeclaration, 'findById').resolves(null);

  await paymentController.submitPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 404);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarație de plată negăsită');
});

it('should return 400 if approve non-pending', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'admin123' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    status: 'draft'
  });

  await paymentController.approvePaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarația nu este în așteptare');
});

it('should return 400 if reject no reason', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'admin123' }, body: {} };

  await paymentController.rejectPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Motivul respingerii este obligatoriu');
});

it('should return 404 if reject not found', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'admin123' }, body: { rejectionReason: 'Bad' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves(null);

  await paymentController.rejectPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 404);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarație de plată negăsită');
});

it('should return 400 if reject non-pending', async () => {
  const req = { params: { id: 'pay123' }, user: { id: 'admin123' }, body: { rejectionReason: 'Bad' } };

  sinon.stub(PaymentDeclaration, 'findById').resolves({
    _id: 'pay123',
    status: 'draft'
  });

  await paymentController.rejectPaymentDeclaration(req, res);

  sinon.assert.calledWith(res.status, 400);
  const result = res.json.firstCall.args[0];
  expect(result.message).toBe('Declarația nu este în așteptare');
});


});
