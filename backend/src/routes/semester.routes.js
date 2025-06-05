const express = require('express');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const semCtrl = require('../controllers/semesterConfigController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Semester Configuration
 *     description: API endpoints for semester configuration management
 *
 * components:
 *   schemas:
 *     SemesterWeek:
 *       type: object
 *       properties:
 *         weekNumber:
 *           type: string
 *           pattern: ^S\d{2}$
 *           description: Week number in format S01, S02, etc.
 *           example: "S01"
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date of the week
 *         weekType:
 *           type: string
 *           enum: [Par, Impar]
 *           description: Week type (Even or Odd)
 *     SemesterConfiguration:
 *       type: object
 *       required:
 *         - academicYear
 *         - semester
 *         - faculty
 *         - startDate
 *         - endDate
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID
 *         academicYear:
 *           type: string
 *           pattern: ^\d{4}\/\d{4}$
 *           description: Academic year in format YYYY/YYYY
 *           example: "2024/2025"
 *         semester:
 *           type: integer
 *           enum: [1, 2]
 *           description: Semester number
 *         faculty:
 *           type: string
 *           description: Faculty name
 *           example: "Inginerie"
 *         startDate:
 *           type: string
 *           format: date
 *           description: Semester start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Semester end date
 *         weeks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SemesterWeek'
 *           description: Array of semester weeks
 *         isMedicine:
 *           type: boolean
 *           default: false
 *           description: Whether this is for Faculty of Medicine (extended weeks)
 *         specialWeeks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               weekNumber:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               weekType:
 *                 type: string
 *                 enum: [Par, Impar]
 *           description: Special weeks for Medicine faculty
 *         status:
 *           type: string
 *           enum: [draft, active, archived]
 *           default: draft
 *           description: Configuration status
 *         createdBy:
 *           type: string
 *           description: User ID who created the configuration
 */

/**
 * @swagger
 * /api/semester:
 *   post:
 *     summary: Create a new semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - academicYear
 *               - semester
 *               - faculty
 *               - startDate
 *               - endDate
 *             properties:
 *               academicYear:
 *                 type: string
 *                 pattern: ^\d{4}\/\d{4}$
 *                 example: "2024/2025"
 *               semester:
 *                 type: integer
 *                 enum: [1, 2]
 *               faculty:
 *                 type: string
 *                 example: "Inginerie"
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isMedicine:
 *                 type: boolean
 *                 default: false
 *               weeks:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SemesterWeek'
 *               specialWeeks:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Semester configuration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterConfiguration'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Configuration already exists
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/semester
 * @desc    Create a new semester configuration (admin only)
 * @access  Private/Admin
 */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.createSemesterConfig
);

/**
 * @swagger
 * /api/semester:
 *   get:
 *     summary: Get all semester configurations with filtering
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: faculty
 *         schema:
 *           type: string
 *         description: Filter by faculty
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *         description: Filter by semester
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of semester configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SemesterConfiguration'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/semester
 * @desc    Get all semester configurations
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  semCtrl.getSemesterConfigs
);

/**
 * @swagger
 * /api/semester/current:
 *   get:
 *     summary: Get current active semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: faculty
 *         schema:
 *           type: string
 *         description: Filter by faculty
 *     responses:
 *       200:
 *         description: Current active semester configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterConfiguration'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active semester found
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/semester/current
 * @desc    Get current active semester configuration
 * @access  Private
 */
router.get(
  '/current',
  authMiddleware,
  semCtrl.getCurrentSemesterConfig
);

/**
 * @swagger
 * /api/semester/faculty/{faculty}:
 *   get:
 *     summary: Get semester configurations by faculty
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faculty
 *         required: true
 *         schema:
 *           type: string
 *         description: Faculty name
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *       - in: query
 *         name: semester
 *         schema:
 *           type: integer
 *         description: Filter by semester
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of semester configurations for the faculty
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SemesterConfiguration'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/faculty/:faculty',
  authMiddleware,
  semCtrl.getSemesterConfigsByFaculty
);

/**
 * @swagger
 * /api/semester/{id}:
 *   get:
 *     summary: Get semester configuration by ID
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     responses:
 *       200:
 *         description: Semester configuration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterConfiguration'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/semester/:id
 * @desc    Get semester configuration by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  semCtrl.getSemesterConfigById
);

/**
 * @swagger
 * /api/semester/{id}:
 *   put:
 *     summary: Update semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
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
 *                 type: integer
 *               faculty:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isMedicine:
 *                 type: boolean
 *               weeks:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SemesterWeek'
 *               specialWeeks:
 *                 type: array
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SemesterConfiguration'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       409:
 *         description: Duplicate configuration
 *       500:
 *         description: Server error
 */

/**
 * @route   PUT /api/semester/:id
 * @desc    Update semester configuration (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.updateSemesterConfig
);

/**
 * @swagger
 * /api/semester/{id}:
 *   delete:
 *     summary: Delete semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */

/**
 * @route   DELETE /api/semester/:id
 * @desc    Delete semester configuration (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.deleteSemesterConfig
);

/**
 * @swagger
 * /api/semester/{id}/week-info:
 *   get:
 *     summary: Get week information for a specific date in semester
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to get week information for
 *     responses:
 *       200:
 *         description: Week information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weekNumber:
 *                   type: string
 *                   example: "S01"
 *                 weekType:
 *                   type: string
 *                   enum: [Par, Impar]
 *                 startDate:
 *                   type: string
 *                   format: date
 *                 endDate:
 *                   type: string
 *                   format: date
 *                 isSpecialWeek:
 *                   type: boolean
 *       400:
 *         description: Invalid date parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Configuration not found or date outside semester
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/semester/:id/week-info
 * @desc    Get week information (odd/even) for a date in a semester
 * @access  Private
 */
router.get(
  '/:id/week-info',
  authMiddleware,
  semCtrl.getWeekInfo
);

/**
 * @swagger
 * /api/semester/{id}/generate-weeks:
 *   post:
 *     summary: Generate semester weeks automatically
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to overwrite existing weeks
 *               customWeekCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 description: Custom number of weeks (overrides default calculation)
 *     responses:
 *       200:
 *         description: Weeks generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 weeksGenerated:
 *                   type: integer
 *                 semester:
 *                   $ref: '#/components/schemas/SemesterConfiguration'
 *       400:
 *         description: Invalid parameters or weeks already exist
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/semester/:id/generate-weeks
 * @desc    Generate weeks for semester configuration (admin only)
 * @access  Private/Admin
 */
router.post(
  '/:id/generate-weeks',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.generateWeeks
);

/**
 * @swagger
 * /api/semester/{id}/validate-calendar:
 *   post:
 *     summary: Validate semester configuration against calendar
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     responses:
 *       200:
 *         description: Validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [holiday_conflict, weekend_conflict, date_range_invalid]
 *                       weekNumber:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       description:
 *                         type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/semester/:id/validate-calendar
 * @desc    Validate semester configuration against calendar (admin only)
 * @access  Private/Admin
 */
router.post(
  '/:id/validate-calendar',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.validateAgainstCalendar
);

/**
 * @swagger
 * /api/semester/{id}/activate:
 *   put:
 *     summary: Activate semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     responses:
 *       200:
 *         description: Configuration activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 semester:
 *                   $ref: '#/components/schemas/SemesterConfiguration'
 *                 deactivatedConfigs:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs of configurations that were deactivated
 *       400:
 *         description: Configuration cannot be activated (validation errors)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       409:
 *         description: Configuration already active
 *       500:
 *         description: Server error
 */

/**
 * @route   PUT /api/semester/:id/activate
 * @desc    Activate semester configuration (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id/activate',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.activateSemesterConfig
);

/**
 * @swagger
 * /api/semester/{id}/vacation-periods:
 *   post:
 *     summary: Add vacation period to semester configuration
 *     tags: [Semester Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Semester configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the vacation period
 *                 example: "Winter Break"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date of vacation period
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date of vacation period
 *               description:
 *                 type: string
 *                 description: Optional description of the vacation period
 *     responses:
 *       200:
 *         description: Vacation period added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 semester:
 *                   $ref: '#/components/schemas/SemesterConfiguration'
 *                 affectedWeeks:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Week numbers affected by the vacation period
 *       400:
 *         description: Invalid vacation period dates or overlaps
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/semester/:id/vacation-periods
 * @desc    Add vacation period to semester configuration (admin only)
 * @access  Private/Admin
 */
router.post(
  '/:id/vacation-periods',
  authMiddleware,
  authorizeRoles('admin'),
  semCtrl.addVacationPeriod
);

module.exports = router;