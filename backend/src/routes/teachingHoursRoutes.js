/**
 * @swagger
 * tags:
 *  name: Teaching Hours
 *  description: API endpoints for managing teaching hours
 */

/**
 * @swagger
 * components:
 *  schemas:
 *    TeachingHours:
 *      type: object
 *      required:
 *        - user
 *        - activityDate
 *        - disciplineCode
 *        - disciplineName
 *        - activityType
 *        - hoursWorked
 *        - studyProgram
 *        - yearOfStudy
 *        - semester
 *      properties:
 *        id:
 *          type: string
 *          description: The auto-generated ID
 *        user:
 *          type: string
 *          description: User ID reference
 *        activityDate:
 *          type: string
 *          format: date
 *          description: Date of the teaching activity
 *        disciplineCode:
 *          type: string
 *          description: Code of the discipline
 *        disciplineName:
 *          type: string
 *          description: Name of the discipline
 *        activityType:
 *          type: string
 *          enum: [course, seminar, laboratory, project]
 *          description: Type of teaching activity
 *        hoursWorked:
 *          type: number
 *          description: Number of hours worked
 *        studyProgram:
 *          type: string
 *          description: Study program name
 *        yearOfStudy:
 *          type: number
 *          description: Year of study
 *        semester:
 *          type: number
 *          description: Semester number
 *        verified:
 *          type: boolean
 *          default: false
 *          description: Verification status
 *        status:
 *          type: string
 *          enum: [pending, verified, rejected]
 *          default: pending
 *          description: Status of the hours record
 *      example:
 *        activityDate: "2025-05-15"
 *        disciplineCode: "CS101"
 *        disciplineName: "Introduction to Programming"
 *        activityType: "course"
 *        hoursWorked: 4
 *        studyProgram: "Computer Science"
 *        yearOfStudy: 1
 *        semester: 1
 */

const express = require('express');
const router = express.Router();
const multer = require('multer'); // For file uploads (you'll need to npm install multer)
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const teachingHoursController = require('../controllers/teachingHoursController');

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

// *** SPECIAL ROUTES FIRST (before parametrized routes) ***

/**
 * @swagger
 * /api/teaching-hours/statistics:
 *   get:
 *     summary: Get statistics for teaching hours
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Statistics for teaching hours
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalHours:
 *                   type: number
 *                 verifiedHours:
 *                   type: number
 *                 pendingHours:
 *                   type: number
 *                 rejectedHours:
 *                   type: number
 *                 byActivityType:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/statistics', authMiddleware, teachingHoursController.getStatistics);

/**
 * @swagger
 * /api/teaching-hours/export:
 *   get:
 *     summary: Export teaching hours to Excel
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Academic year to filter
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *         description: Semester to filter
 *     responses:
 *       200:
 *         description: Excel file with teaching hours data
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/export', authMiddleware, teachingHoursController.exportToExcel);

/**
 * @swagger
 * /api/teaching-hours/import:
 *   post:
 *     summary: Import teaching hours from Excel
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import completed successfully
 *       400:
 *         description: Invalid file format or data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/import', authMiddleware, upload.single('file'), teachingHoursController.importFromExcel);

/**
 * @swagger
 * /api/teaching-hours/validate:
 *   post:
 *     summary: Validate teaching hours against calendar
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               academicYear:
 *                 type: string
 *               semester:
 *                 type: number
 *             required:
 *               - academicYear
 *               - semester
 *     responses:
 *       200:
 *         description: Validation results
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/validate', authMiddleware, teachingHoursController.validateTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/bulk-update:
 *   put:
 *     summary: Bulk update teaching hours
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               action:
 *                 type: string
 *                 enum: [verify, reject]
 *               rejectionReason:
 *                 type: string
 *             required:
 *               - ids
 *               - action
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.put('/bulk-update', authMiddleware, authorizeRoles('admin'), 
  teachingHoursController.bulkUpdateTeachingHours);

// *** STANDARD CRUD ROUTES ***

/**
 * @swagger
 * /api/teaching-hours:
 *   post:
 *     summary: Create a new teaching hours record
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeachingHours'
 *     responses:
 *       201:
 *         description: Teaching hours record created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, teachingHoursController.createTeachingHours);

/**
 * @swagger
 * /api/teaching-hours:
 *   get:
 *     summary: Get all teaching hours for the current user with filtering and pagination
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of teaching hours records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, teachingHoursController.getTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/{id}:
 *   get:
 *     summary: Get a single teaching hours record by ID
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teaching hours record
 *     responses:
 *       200:
 *         description: Teaching hours record found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeachingHours'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, teachingHoursController.getTeachingHoursById);

/**
 * @swagger
 * /api/teaching-hours/{id}:
 *   put:
 *     summary: Update a teaching hours record
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teaching hours record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeachingHours'
 *     responses:
 *       200:
 *         description: Teaching hours record updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot update verified records
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, teachingHoursController.updateTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/{id}:
 *   delete:
 *     summary: Delete a teaching hours record
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teaching hours record
 *     responses:
 *       200:
 *         description: Teaching hours record deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot delete verified records
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, teachingHoursController.deleteTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/{id}/verify:
 *   put:
 *     summary: Verify a teaching hours record
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teaching hours record
 *     responses:
 *       200:
 *         description: Teaching hours record verified successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.put('/:id/verify', authMiddleware, authorizeRoles('admin'), 
  teachingHoursController.verifyTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/{id}/reject:
 *   put:
 *     summary: Reject a teaching hours record
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the teaching hours record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection
 *             required:
 *               - rejectionReason
 *     responses:
 *       200:
 *         description: Teaching hours record rejected successfully
 *       400:
 *         description: Invalid input - rejection reason required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Record not found *       500:
 *         description: Server error
 */
router.get('/export', authMiddleware, teachingHoursController.exportToExcel);

/**
 * @swagger
 * /api/teaching-hours/import:
 *   post:
 *     summary: Import teaching hours from Excel
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx, .xls) with teaching hours data
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Teaching hours imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 imported:
 *                   type: number
 *                 errors:
 *                   type: array
 *       400:
 *         description: Invalid file format or data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/import', authMiddleware, upload.single('file'), teachingHoursController.importFromExcel);

/**
 * @swagger
 * /api/teaching-hours/validate:
 *   post:
 *     summary: Validate teaching hours against calendar
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activityDate:
 *                 type: string
 *                 format: date
 *                 description: Date of the teaching activity
 *               disciplineCode:
 *                 type: string
 *                 description: Code of the discipline
 *               activityType:
 *                 type: string
 *                 enum: [course, seminar, laboratory, project]
 *                 description: Type of teaching activity
 *             required:
 *               - activityDate
 *               - disciplineCode
 *               - activityType
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/validate', authMiddleware, teachingHoursController.validateTeachingHours);

/**
 * @swagger
 * /api/teaching-hours/bulk-update:
 *   put:
 *     summary: Bulk update teaching hours (change status, verify, reject)
 *     tags: [Teaching Hours]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of teaching hours IDs to update
 *               action:
 *                 type: string
 *                 enum: [verify, reject]
 *                 description: Action to perform on the records
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection (required when action is 'reject')
 *             required:
 *               - ids
 *               - action
 *     responses:
 *       200:
 *         description: Records updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updated:
 *                   type: number
 *                 failed:
 *                   type: number
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.put('/bulk-update', authMiddleware, authorizeRoles('admin'), 
  teachingHoursController.bulkUpdateTeachingHours);

module.exports = router;