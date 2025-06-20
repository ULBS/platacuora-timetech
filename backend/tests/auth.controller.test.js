const sinon = require('sinon');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const authController = require('../src/controllers/auth.controller');

describe('authController', () => {
  beforeAll(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('googleCallback', () => {
    it('should call passport.authenticate with google strategy', () => {
      const req = {};
      const res = {};
      const next = sinon.spy();

      const passportStub = sinon.stub(passport, 'authenticate').returns(() => {});
      authController.googleCallback(req, res, next);

      sinon.assert.calledOnce(passportStub);
      sinon.assert.calledWith(passportStub, 'google', sinon.match.has('session', false), sinon.match.func);
    });

    it('should redirect with error if profile is missing', async () => {
      const req = {};
      const res = { redirect: sinon.spy() };
      const next = sinon.spy();

      sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return () => callback(null, null, {});
      });

      await authController.googleCallback(req, res, next);

      sinon.assert.calledWith(res.redirect, sinon.match(/error=authentication_failed/));
    });

    it('should redirect with error if no email in profile', async () => {
      const req = {};
      const res = { redirect: sinon.spy() };
      const next = sinon.spy();

      sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return () => callback(null, { emails: [{}] }, {});
      });

      await authController.googleCallback(req, res, next);

      sinon.assert.calledWith(res.redirect, sinon.match(/error=no_email/));
    });

    it('should redirect with authentication_failed if passport returns error', async () => {
      const req = {};
      const res = { redirect: sinon.spy() };
      const next = sinon.spy();

      sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return () => callback(new Error('Unexpected error'), null, {});
      });

      await authController.googleCallback(req, res, next);

      sinon.assert.calledWith(res.redirect, sinon.match(/error=authentication_failed/));
    });

    it('should redirect with error if email domain is not allowed', async () => {
      const req = {};
      const res = { redirect: sinon.spy() };
      const next = sinon.spy();

      sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return () => callback(null, {
          emails: [{ value: 'test@unauthorized.com' }],
          id: '123',
          name: { givenName: 'Test', familyName: 'User' }
        }, {});
      });

      await authController.googleCallback(req, res, next);

      sinon.assert.calledWith(res.redirect, sinon.match(/error=invalid_domain/));
    });

it('should redirect with server error on thrown exception', async () => {
  const req = {};
  const res = { redirect: sinon.spy() };
  const next = sinon.spy();

  sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
    return () => callback(new Error('Simulated callback error'), null, {});
  });

  await authController.googleCallback(req, res, next);

  sinon.assert.calledWith(res.redirect, sinon.match(/error=authentication_failed/));
});

  });

  describe('logout', () => {
    it('should clear cookie and return success', () => {
      const res = {
        clearCookie: sinon.spy(),
        json: sinon.spy()
      };

      authController.logout({}, res);

      sinon.assert.calledWith(res.clearCookie, 'auth_token');
      sinon.assert.calledWith(res.json, { message: 'Delogare cu succes' });
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data if user exists', async () => {
      const req = { user: { id: 'user123' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves({ _id: 'user123', email: 'test@ulbsibiu.ro' })
      });

      await authController.getCurrentUser(req, res);

      sinon.assert.calledWith(res.json, sinon.match.has('_id', 'user123'));
    });

    it('should return 404 if user not found', async () => {
      const req = { user: { id: 'user123' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves(null)
      });

      await authController.getCurrentUser(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledWith(res.json, { message: 'Utilizator negăsit' });
    });

    it('should return 500 if db error', async () => {
      const req = { user: { id: 'user123' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(User, 'findById').throws(new Error('DB Error'));

      await authController.getCurrentUser(req, res);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.json, { message: 'Eroare de server' });
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return updated user', async () => {
      const req = { user: { id: 'user123' }, body: { faculty: 'CS', department: 'AI', position: 'Prof' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(User, 'findByIdAndUpdate').resolves({ _id: 'user123', position: 'Prof' });

      await authController.updateProfile(req, res);

      sinon.assert.calledWith(res.json, sinon.match.has('position', 'Prof'));
    });

    it('should return 400 for invalid position', async () => {
      const req = { user: { id: 'user123' }, body: { position: 'Invalid' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      await authController.updateProfile(req, res);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledWith(res.json, { message: 'Poziție invalidă' });
    });

    it('should return 500 if update fails', async () => {
      const req = { user: { id: 'user123' }, body: { faculty: 'CS', department: 'AI', position: 'Prof' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(User, 'findByIdAndUpdate').throws(new Error('DB Error'));

      await authController.updateProfile(req, res);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledWith(res.json, { message: 'Eroare de server' });
    });
  });

  describe('verifyToken', () => {
    it('should return user data if token is valid', async () => {
      const req = { cookies: { auth_token: 'validtoken' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(jwt, 'verify').returns({ id: 'user123' });
      sinon.stub(User, 'findById').returns({
        select: sinon.stub().resolves({ _id: 'user123', email: 'test@ulbsibiu.ro' })
      });

      await authController.verifyToken(req, res);

      sinon.assert.calledWith(res.json, sinon.match.has('id', 'user123'));
    });

    it('should return 401 if no token provided', async () => {
      const req = { cookies: {}, body: {}, query: {}, headers: {} };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      await authController.verifyToken(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledWith(res.json, { message: 'Token de autentificare negăsit' });
    });

    it('should return 401 if token invalid', async () => {
      const req = { cookies: { auth_token: 'invalidtoken' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(jwt, 'verify').throws(new Error('invalid token'));

      await authController.verifyToken(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledWith(res.json, { message: 'Token invalid sau expirat' });
    });

it('should return 404 if token missing id leads to no user', async () => {
  const req = { cookies: { auth_token: 'validtoken' } };
  const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

  sinon.stub(jwt, 'verify').returns({});
  sinon.stub(User, 'findById').returns({ select: sinon.stub().resolves(null) });

  await authController.verifyToken(req, res);

  sinon.assert.calledWith(res.status, 404);
  sinon.assert.calledWith(res.json, { message: 'Utilizatorul nu a fost găsit' });
});



    it('should return 404 if user from token not found', async () => {
      const req = { cookies: { auth_token: 'validtoken' } };
      const res = { json: sinon.spy(), status: sinon.stub().returnsThis() };

      sinon.stub(jwt, 'verify').returns({ id: 'user123' });
      sinon.stub(User, 'findById').returns({ select: sinon.stub().resolves(null) });

      await authController.verifyToken(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledWith(res.json, { message: 'Utilizatorul nu a fost găsit' });
    });
  });
});
