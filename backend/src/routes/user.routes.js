// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

router.get(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  userCtrl.getAllUsers
);

router.get(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  userCtrl.getUserById
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  userCtrl.updateUser
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  userCtrl.deleteUser
);

module.exports = router;