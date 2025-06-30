const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const EnhancedPDFController = require('../controllers/enhancedPdfController');

/**
 * @swagger
 * components:
 *   schemas:
 *     PDFOptions:
 *       type: object
 *       properties:
 *         enhanced:
 *           type: boolean
 *           description: Use enhanced PDF generation
 *           default: true
 *         includeQR:
 *           type: boolean
 *           description: Include QR code for verification
 *           default: true
 *         includeWatermark:
 *           type: boolean
 *           description: Include watermark for draft documents
 *           default: false
 *         digitalSignature:
 *           type: boolean
 *           description: Apply digital signature
 *           default: false
 *         template:
 *           type: string
 *           enum: [ulbs-official, legacy]
 *           description: PDF template to use
 *           default: ulbs-official
 *         batchSize:
 *           type: integer
 *           description: Number of PDFs to process in parallel
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 */

/**
 * @swagger
 * /api/pdf/enhanced/{id}:
 *   post:
 *     summary: Generate enhanced PDF for payment declaration
 *     description: Generate PDF using the official ULBS template with data integration from TeachingHours and Calendar
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment declaration ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PDFOptions'
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: PDF filename
 *             schema:
 *               type: string
 *           X-Document-ID:
 *             description: Document ID
 *             schema:
 *               type: string
 *           X-Digital-Signature:
 *             description: Digital signature status
 *             schema:
 *               type: string
 *       404:
 *         description: Declaration not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post('/enhanced/:id', authMiddleware, EnhancedPDFController.generateEnhancedPDF);

/**
 * @swagger
 * /api/pdf/batch:
 *   post:
 *     summary: Generate multiple PDFs in batch
 *     description: Generate PDFs for multiple declarations with optimization for high volumes
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - declarationIds
 *             properties:
 *               declarationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of declaration IDs
 *               options:
 *                 $ref: '#/components/schemas/PDFOptions'
 *     responses:
 *       200:
 *         description: Batch processing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     totalSize:
 *                       type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       error:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       signed:
 *                         type: boolean
 *                 downloadLinks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       signed:
 *                         type: boolean
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post('/batch', authMiddleware, EnhancedPDFController.generateBatchPDFs);

/**
 * @swagger
 * /api/pdf/summary/{academicYear}/{semester}:
 *   post:
 *     summary: Generate summary report PDF
 *     description: Generate a summary report for all teaching activities in a semester
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: academicYear
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}/\d{4}$'
 *         description: Academic year (e.g., 2023/2024)
 *       - in: path
 *         name: semester
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [1, 2]
 *         description: Semester number
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeDetails:
 *                 type: boolean
 *                 default: true
 *               includeCharts:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Summary report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/summary/:academicYear/:semester', authMiddleware, EnhancedPDFController.generateSummaryReport);

/**
 * @swagger
 * /api/pdf/batch/{batchId}/status:
 *   get:
 *     summary: Get batch processing status
 *     description: Check the status of a batch PDF generation operation
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch operation ID
 *     responses:
 *       200:
 *         description: Batch status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 progress:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 100
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     processed:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Server error
 */
router.get('/batch/:batchId/status', authMiddleware, EnhancedPDFController.getBatchStatus);

/**
 * @swagger
 * /api/pdf/verify/{id}:
 *   get:
 *     summary: Verify PDF digital signature
 *     description: Verify the digital signature of a PDF document
 *     tags: [Enhanced PDF]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Signature verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documentId:
 *                   type: string
 *                 isVerified:
 *                   type: boolean
 *                 signatureInfo:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     signer:
 *                       type: string
 *                     algorithm:
 *                       type: string
 *                     isValid:
 *                       type: boolean
 *                 documentInfo:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     academicYear:
 *                       type: string
 *                     semester:
 *                       type: integer
 *                     user:
 *                       type: string
 *       404:
 *         description: Document not found
 *       500:
 *         description: Server error
 */
router.get('/verify/:id', EnhancedPDFController.verifySignature);

/**
 * @swagger
 * /api/pdf/certificate/info:
 *   get:
 *     summary: Get certificate information
 *     description: Get information about the digital signature certificate
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certificate information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAvailable:
 *                   type: boolean
 *                 certificate:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: object
 *                     issuer:
 *                       type: object
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                     validTo:
 *                       type: string
 *                       format: date-time
 *                     isValid:
 *                       type: boolean
 *                     isExpired:
 *                       type: boolean
 *                     isSelfSigned:
 *                       type: boolean
 *       404:
 *         description: Certificate not configured
 *       500:
 *         description: Server error
 */
router.get('/certificate/info', authMiddleware, EnhancedPDFController.getCertificateInfo);

/**
 * @swagger
 * /api/pdf/certificate/init-test:
 *   post:
 *     summary: Initialize test certificate
 *     description: Generate a test certificate for development purposes (dev environment only)
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test certificate generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 certificate:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: string
 *                     password:
 *                       type: string
 *                     organization:
 *                       type: object
 *       403:
 *         description: Not available in production
 *       500:
 *         description: Server error
 */
router.post('/certificate/init-test', authMiddleware, EnhancedPDFController.initializeTestCertificate);

/**
 * @swagger
 * /api/pdf/templates:
 *   get:
 *     summary: Get available PDF templates
 *     description: Get information about available PDF templates
 *     tags: [Enhanced PDF]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 *                       isDefault:
 *                         type: boolean
 *                 currentDefault:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.get('/templates', authMiddleware, EnhancedPDFController.getTemplateInfo);

module.exports = router;
