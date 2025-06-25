const sinon = require('sinon');
const controller = require('../src/controllers/userController');
const User = require('../src/models/user.model');  // modificat aici

describe('userController', () => {
  let res;

  beforeEach(() => {
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should get all users', async () => {
    const selectStub = sinon.stub().resolves([{ _id: 'user1' }, { _id: 'user2' }]);
    sinon.stub(User, 'find').returns({ select: selectStub });

    await controller.getAllUsers({}, res);

    sinon.assert.calledOnce(res.json);
    const result = res.json.firstCall.args[0];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('should handle error on getAllUsers', async () => {
    sinon.stub(User, 'find').throws(new Error('DB Error'));

    await controller.getAllUsers({}, res);

    sinon.assert.calledWith(res.status, 500);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/server/i);
  });

  it('should get user by ID', async () => {
    const req = { params: { id: 'user1' } };
    const selectStub = sinon.stub().resolves({ _id: 'user1' });
    sinon.stub(User, 'findById').returns({ select: selectStub });

    await controller.getUserById(req, res);

    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0]).toHaveProperty('_id', 'user1');
  });

  it('should return 404 if user not found by ID', async () => {
    const req = { params: { id: 'user1' } };
    const selectStub = sinon.stub().resolves(null);
    sinon.stub(User, 'findById').returns({ select: selectStub });

    await controller.getUserById(req, res);

    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/negăsit/i);
  });

  it('should handle error on getUserById', async () => {
    const req = { params: { id: 'user1' } };
    sinon.stub(User, 'findById').throws(new Error('DB Error'));

    await controller.getUserById(req, res);

    sinon.assert.calledWith(res.status, 500);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/server/i);
  });

  it('should update user role', async () => {
    const req = { params: { id: 'user1' }, body: { role: 'admin' } };
    sinon.stub(User, 'findByIdAndUpdate').resolves({ _id: 'user1', role: 'admin' });

    await controller.updateUser(req, res);

    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].role).toBe('admin');
  });

  it('should return 400 for invalid role', async () => {
    const req = { params: { id: 'user1' }, body: { role: 'invalid' } };

    await controller.updateUser(req, res);

    sinon.assert.calledWith(res.status, 400);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/rol invalid/i);
  });

  it('should return 404 if updated user not found', async () => {
    const req = { params: { id: 'user1' }, body: { role: 'user' } };
    sinon.stub(User, 'findByIdAndUpdate').resolves(null);

    await controller.updateUser(req, res);

    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/negăsit/i);
  });

  it('should handle error on updateUser', async () => {
    const req = { params: { id: 'user1' }, body: { role: 'user' } };
    sinon.stub(User, 'findByIdAndUpdate').throws(new Error('DB Error'));

    await controller.updateUser(req, res);

    sinon.assert.calledWith(res.status, 500);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/server/i);
  });

  it('should delete user', async () => {
    const req = { params: { id: 'user1' } };
    sinon.stub(User, 'findByIdAndDelete').resolves({ _id: 'user1' });

    await controller.deleteUser(req, res);

    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/șters/i);
  });

  it('should return 404 if deleted user not found', async () => {
    const req = { params: { id: 'user1' } };
    sinon.stub(User, 'findByIdAndDelete').resolves(null);

    await controller.deleteUser(req, res);

    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/negăsit/i);
  });

  it('should handle error on deleteUser', async () => {
    const req = { params: { id: 'user1' } };
    sinon.stub(User, 'findByIdAndDelete').throws(new Error('DB Error'));

    await controller.deleteUser(req, res);

    sinon.assert.calledWith(res.status, 500);
    sinon.assert.calledOnce(res.json);
    expect(res.json.firstCall.args[0].message).toMatch(/server/i);
  });
});
