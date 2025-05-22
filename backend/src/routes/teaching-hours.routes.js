const express = require('express');
const router = express.Router();
const thCtrl = require('../controllers/teachingHoursController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configure multer for Excel file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: (req, file, cb) => {
    // Check if file is Excel
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Formatul fișierului nu este acceptat. Încărcați un fișier Excel (.xlsx sau .xls).'), false);
    }
  }
});

// Special routes first (before parameterized routes)
router.get('/statistics', authMiddleware, thCtrl.getStatistics);
router.get('/export', authMiddleware, thCtrl.exportToExcel);
router.post('/import', authMiddleware, upload.single('file'), thCtrl.importFromExcel);
router.post('/validate', authMiddleware, thCtrl.validateTeachingHours);
router.put('/bulk-update', authMiddleware, authorizeRoles('admin', 'departmentHead', 'dean'), 
  thCtrl.bulkUpdateTeachingHours);

// Standard CRUD routes
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

// Verification routes
router.put('/:id/verify', authMiddleware, authorizeRoles('admin', 'departmentHead', 'dean'), 
  thCtrl.verifyTeachingHours);

router.put('/:id/reject', authMiddleware, authorizeRoles('admin', 'departmentHead', 'dean'), 
  thCtrl.rejectTeachingHours);

module.exports = router;