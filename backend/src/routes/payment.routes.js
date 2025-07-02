const express = require('express');
const paymentCtrl = require('../controllers/paymentDeclarationController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: APIs for managing payment declarations (PO)
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentDeclaration:
 *       type: object
 *       required:
 *         - user
 *         - academicYear
 *         - semester
 *         - faculty
 *         - startDate
 *         - endDate
 *         - items
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID
 *         user:
 *           type: string
 *           description: User ID reference
 *         faculty:
 *           type: string
 *           description: Faculty name
 *         department:
 *           type: string
 *           description: Department name
 *         academicYear:
 *           type: string
 *           description: Academic year (e.g., 2024/2025)
 *         semester:
 *           type: integer
 *           description: Semester number
 *         startDate:
 *           type: string
 *           format: date
 *           description: Declaration start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Declaration end date
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved_department, approved_dean, rejected]
 *           description: Approval workflow status
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               postNumber:
 *                 type: integer
 *               postGrade:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               courseHours:
 *                 type: number
 *               seminarHours:
 *                 type: number
 *               labHours:
 *                 type: number
 *               projectHours:
 *                 type: number
 *               activityType:
 *                 type: string
 *               coefficient:
 *                 type: number
 *               totalHours:
 *                 type: number
 *               groups:
 *                 type: string
 *       example:
 *         user: "682df3321715426d44c13849"
 *         faculty: "Inginerie"
 *         department: "Calculatoare"
 *         academicYear: "2024/2025"
 *         semester: 1
 *         startDate: "2025-05-27"
 *         endDate: "2025-05-29"
 *         status: "draft"
 *         items:
 *           - postNumber: 1
 *             postGrade: "Lect"
 *             date: "2025-05-27"
 *             courseHours: 2
 *             seminarHours: 0
 *             labHours: 0
 *             projectHours: 0
 *             activityType: "LR"
 *             coefficient: 1
 *             totalHours: 2
 *             groups: "A"
 */

/**
 * @swagger
 * /api/payment/all:
 *   get:
 *     summary: Retrieve all payment declarations for the current user (fallback to all if none)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment declarations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentDeclaration'
 *       500:
 *         description: Server error
 * @route   GET /api/payment/all
 * @desc    Get all payment declarations (PO)
 * @access  Private
 */
router.get(
    '/all',
    authMiddleware,
    paymentCtrl.getAllPO
);

/**
 * @swagger
 * /api/payment:
 *   post:
 *     summary: Create a new payment declaration
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentDeclaration'
 *     responses:
 *       201:
 *         description: Declaration created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentDeclaration'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 * @route   POST /api/payment
 * @desc    Create new payment declaration
 * @access  Private
 */
router.post(
    '/',
    authMiddleware,
    paymentCtrl.createPaymentDeclaration
);

/**
 * @swagger
 * /api/payment:
 *   get:
 *     summary: Retrieve payment declarations for the current user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentDeclaration'
 *       500:
 *         description: Server error
 * @route   GET /api/payment
 * @desc    Get payment declarations for the current user
 * @access  Private
 */
router.get(
    '/',
    authMiddleware,
    paymentCtrl.getPaymentDeclarations
);

/**
 * @swagger
 * /api/payment/admin:
 *   get:
 *     summary: Retrieve all payment declarations (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentDeclaration'
 *       403:
 *         description: Forbidden
 * @route   GET /api/payment/admin
 * @desc    Get all payment declarations (admin only)
 * @access  Private/Admin
 */
router.get(
    '/admin',
    authMiddleware,
    authorizeRoles('admin'),
    paymentCtrl.adminGetPaymentDeclarations
);

/**
 * @swagger
 * /api/payment/{id}:
 *   get:
 *     summary: Retrieve a payment declaration by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Declaration ID
 *     responses:
 *       200:
 *         description: Declaration data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentDeclaration'
 *       404:
 *         description: Not found
 * @route   GET /api/payment/:id
 * @desc    Get payment declaration by ID
 * @access  Private
 */
router.get(
    '/:id',
    authMiddleware,
    paymentCtrl.getPaymentDeclarationById
);

/**
 * @swagger
 * /api/payment/{id}:
 *   put:
 *     summary: Update a payment declaration
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Declaration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentDeclaration'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentDeclaration'
 *       400:
 *         description: Validation error
 * @route   PUT /api/payment/:id
 * @desc    Update payment declaration
 * @access  Private
 */
router.put(
    '/:id',
    authMiddleware,
    paymentCtrl.updatePaymentDeclaration
);

/**
 * @swagger
 * /api/payment/{id}:
 *   delete:
 *     summary: Delete a payment declaration
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Declaration ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 * @route   DELETE /api/payment/:id
 * @desc    Delete payment declaration
 * @access  Private
 */
router.delete(
    '/:id',
    authMiddleware,
    paymentCtrl.deletePaymentDeclaration
);

/**
 * @swagger
 * /api/payment/generate/{calendarId}:
 *   post:
 *     summary: Generate a payment declaration for a verified calendar
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         schema:
 *           type: string
 *         required: true
 *         description: Calendar ID
 *     responses:
 *       201:
 *         description: Declaration created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentDeclaration'
 *       400:
 *         description: Bad request or no hours
 * @route   POST /api/payment/generate/:id
 * @desc    Generate payment declaration for a verified calendar
 * @access  Private
 */
router.post(
    '/generate/:id',
    authMiddleware,
    paymentCtrl.generatePO
);

/**
 * @swagger
 * /api/payment/{id}/generate-pdf:
 *   post:
 *     summary: Generate PDF for a payment declaration and return URL
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Declaration ID
 *     responses:
 *       200:
 *         description: PDF generat, se returnează URL-ul
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pdfUrl:
 *                   type: string
 *                   description: URL unde poate fi descărcat PDF-ul
 * @route   POST /api/payment/:id/generate-pdf
 * @desc    Generate PDF for payment declaration
 * @access  Private
 */
router.post(
    '/:id/generate-pdf',
    authMiddleware,
    paymentCtrl.generatePDF
);

// Enhanced PDF routes
router.post('/:id/pdf/enhanced', authMiddleware, paymentCtrl.generateEnhancedPDF);
router.post('/batch/pdf', authMiddleware, paymentCtrl.generateBatchPDFs);
router.get('/:id/data-preview', authMiddleware, paymentCtrl.getDataPreview);

module.exports = router;


// /**
//  * @route   PUT /api/payment/:id/submit
//  * @desc    Submit payment declaration for approval
//  * @access  Private
//  */
// router.put(
//   '/:id/submit',
//   authMiddleware,
//   paymentCtrl.submitPaymentDeclaration
// );

// /**
//  * @route   PUT /api/payment/:id/approve
//  * @desc    Approve payment declaration (admin only)
//  * @access  Private/Admin
//  */
// router.put(
//   '/:id/approve',
//   authMiddleware,
//   authorizeRoles('admin'),
//   paymentCtrl.approvePaymentDeclaration
// );

// /**
//  * @route   PUT /api/payment/:id/reject
//  * @desc    Reject payment declaration (admin only)
//  * @access  Private/Admin
//  */
// router.put(
//   '/:id/reject',
//   authMiddleware,
//   authorizeRoles('admin'),
//   paymentCtrl.rejectPaymentDeclaration
// );
