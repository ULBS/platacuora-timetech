const express = require('express');
const calendarCtrl = require('../controllers/calendarController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Calendars
 *     description: API endpoints for calendar management
 *
 * components:
 *   schemas:
 *     CalendarDay:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         dayOfWeek:
 *           type: string
 *         isWorkingDay:
 *           type: boolean
 *         oddEven:
 *           type: string
 *           enum: ['', 'Par', 'Impar']
 *         semesterWeek:
 *           type: string
 *         isHoliday:
 *           type: boolean
 *         holidayName:
 *           type: string
 *     Calendar:
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
 *         user:
 *           type: string
 *           description: ID-ul utilizatorului care a creat calendarul
 *         academicYear:
 *           type: string
 *           example: "2024/2025"
 *         semester:
 *           type: integer
 *           example: 1
 *         faculty:
 *           type: string
 *           example: "Inginerie"
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         days:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CalendarDay'
 */

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     summary: Create a new calendar (admin only)
 *     tags: [Calendars]
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
 *                 example: "2024/2025"
 *               semester:
 *                 type: integer
 *                 example: 1
 *               faculty:
 *                 type: string
 *                 example: "Inginerie"
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Calendar creat cu succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Calendar'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/calendar
 * @desc    Create a new calendar (admin only)
 * @access  Private/Admin
 */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.createCalendar
);

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Get all calendars
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista calendarelor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Calendar'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/calendar
 * @desc    Get all calendars
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  calendarCtrl.getCalendars
);

/**
 * @swagger
 * /api/calendar/current:
 *   get:
 *     summary: Get current active calendar
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendarul curent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Calendar'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Nu există calendar activ
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/calendar/current
 * @desc    Get current active calendar
 * @access  Private
 */
router.get(
  '/current',
  authMiddleware,
  calendarCtrl.getCurrentCalendar
);

/**
 * @swagger
 * /api/calendar/{id}:
 *   put:
 *     summary: Update calendar (admin only)
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
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
 *     responses:
 *       200:
 *         description: Calendar actualizat cu succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Calendar'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar negăsit
 *       500:
 *         description: Server error
 */

/**
 * @route   PUT /api/calendar/:id
 * @desc    Update calendar (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.updateCalendar
);

/**
 * @swagger
 * /api/calendar/{id}:
 *   delete:
 *     summary: Delete calendar (admin only)
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
 *     responses:
 *       200:
 *         description: Calendar șters cu succes
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar negăsit
 *       500:
 *         description: Server error
 */

/**
 * @route   DELETE /api/calendar/:id
 * @desc    Delete calendar (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.deleteCalendar
);

/**
 * @swagger
 * /api/calendar/import-holidays:
 *   post:
 *     summary: Import public holidays from external API (admin only)
 *     tags:
 *       - Calendars
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *             properties:
 *               year:
 *                 type: integer
 *                 description: Year to import holidays for
 *               calendarId:
 *                 type: Optional
 *                 description: Optional calendar ID to associate holidays to
 *     responses:
 *       200:
 *         description: Holidays imported
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/calendar/import-holidays
 * @desc    Import public holidays from an external API (admin only)
 * @access  Private/Admin
 */
router.post(
  '/import-holidays',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.importHolidays
);

/*
router.post(
  '/:id/generate',
  authMiddleware, 
  authorizeRoles('admin'),
  calendarCtrl.generateCalendar
);
*/

/**
 * @swagger
 * /api/calendar/{id}/export:
 *   get:
 *     summary: Export calendar days to Excel (admin only)
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar negăsit
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/calendar/:id/export
 * @desc Export calendar.days to Excel
 * @access Private/Admin
 */
router.get(
  '/:id/export',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.exportToExcel
);

/**
 * @swagger
 * /api/calendar/{id}/special-days:
 *   post:
 *     summary: Add special days (admin only)
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - date
 *                 - holidayName
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 holidayName:
 *                   type: string
 *     responses:
 *       200:
 *         description: Special days added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar negăsit
 *       500:
 *         description: Server error
 */

/**
 * @route   POST /api/calendar/:id/special-days
 * @desc    Add special days (exams, local holidays)
 * @access  Private/Admin
 * @_body = [{ date, holidayName }]
 */
router.post(
  '/:id/special-days',
  authMiddleware,
  authorizeRoles('admin'),
  calendarCtrl.addSpecialDays
);

/**
 * @swagger
 * /api/calendar/{id}/day-info:
 *   get:
 *     summary: Get info for a single date
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to query (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: CalendarDay object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarDay'
 *       400:
 *         description: Missing or invalid date
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar or date not found
 *       500:
 *         description: Server error
 */

/**
 * @route   GET /api/calendar/:id/day-info
 * @desc    Get info for a single date
 * @access  Private
 */
router.get(
  '/:id/day-info',
  authMiddleware,
  calendarCtrl.getDayInfo
);



/**
 * @swagger
 * /api/calendar/{id}/generate:
 *   post:
 *     summary: Generate the daily calendar for a semester
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
 *     responses:
 *       200:
 *         description: Calendar generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated:
 *                   type: integer
 *                   description: Number of days generated
 *                 calendar:
 *                   $ref: '#/components/schemas/Calendar'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar not found or missing semester config
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/generate',
  authMiddleware,
  calendarCtrl.generateCalendar
);


/**
 * @swagger
 * /api/calendar/{id}/verify:
 *   post:
 *     summary: Verify that a generated calendar is complete & consistent
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Calendar ID
 *     responses:
 *       200:
 *         description: Calendar verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 calendar:
 *                   $ref: '#/components/schemas/Calendar'
 *       400:
 *         description: Calendar invalid — returns detailed `errors` object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar or semester config not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/verify',
  authMiddleware,
  calendarCtrl.verifyCalendar
);


module.exports = router;