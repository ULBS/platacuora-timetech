const express                   = require('express');
const router                    = express.Router();
const thCtrl                    = require('../controllers/teachingHoursController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

router.post(
  '/',
  authMiddleware,
  thCtrl.createTeachingHours
);

router.get(
  '/',
  authMiddleware,
  thCtrl.getTeachingHours
);

router.get(
  '/admin',
  authMiddleware,
  authorizeRoles('admin'),
  thCtrl.adminGetTeachingHours
);

router.get(
  '/:id',
  authMiddleware,
  thCtrl.getTeachingHoursById
);

router.put(
  '/:id',
  authMiddleware,
  thCtrl.updateTeachingHours
);

router.delete(
  '/:id',
  authMiddleware,
  thCtrl.deleteTeachingHours
);

module.exports = router;
