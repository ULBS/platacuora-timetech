const express = require('express');
const paymentCtrl = require('../controllers/paymentDeclarationController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
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
 * @route   PUT /api/payment/:id/submit
 * @desc    Submit payment declaration for approval
 * @access  Private
 */
router.put(
  '/:id/submit',
  authMiddleware,
  paymentCtrl.submitPaymentDeclaration
);

/**
 * @route   PUT /api/payment/:id/approve
 * @desc    Approve payment declaration (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id/approve',
  authMiddleware,
  authorizeRoles('admin'),
  paymentCtrl.approvePaymentDeclaration
);

/**
 * @route   PUT /api/payment/:id/reject
 * @desc    Reject payment declaration (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:id/reject',
  authMiddleware,
  authorizeRoles('admin'),
  paymentCtrl.rejectPaymentDeclaration
);

/**
 * @route   POST /api/payment/:id/generate-pdf
 * @desc    Generate PDF for payment declaration
 * @access  Private
 */
router.post(
  '/:id/generate-pdf',
  authMiddleware,
  paymentCtrl.generatePDF
);

module.exports = router;