const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentDeclarationController');

router.post('/', paymentCtrl.createPaymentDeclaration);
router.get('/', paymentCtrl.getPaymentDeclarations);
router.get('/:id', paymentCtrl.getPaymentDeclarationById);
router.put('/:id', paymentCtrl.updatePaymentDeclaration);
router.delete('/:id', paymentCtrl.deletePaymentDeclaration);
router.post('/:id/generate-pdf', paymentCtrl.generatePDF);

module.exports = router;