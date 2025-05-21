const express = require('express');
const PaymentDeclaration = require('../models/payment-declaration.model');
const TeachingHours = require('../models/teaching-hours.model');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/payment
 * @desc    Create new payment declaration
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, semesterId, startDate, endDate, teachingHourIds, totalHours, hourlyRate, comments } = req.body;
    

    if (!teachingHourIds || teachingHourIds.length === 0) {
      return res.status(400).json({ message: 'Trebuie să selectați cel puțin o înregistrare de ore predate' });
    }
    
    const teachingHours = await TeachingHours.find({
      _id: { $in: teachingHourIds },
      userId: req.user.id
    });
    
    if (teachingHours.length !== teachingHourIds.length) {
      return res.status(400).json({ message: 'Unele înregistrări de ore predate nu sunt valide' });
    }
    
    let calculatedTotalHours = totalHours;
    if (!calculatedTotalHours) {
      calculatedTotalHours = teachingHours.reduce((total, record) => total + record.hourCount, 0);
    }
    
    const paymentDeclaration = new PaymentDeclaration({
      userId: req.user.id,
      title,
      semesterId,
      startDate,
      endDate,
      teachingHours: teachingHourIds,
      totalHours: calculatedTotalHours,
      hourlyRate,
      totalAmount: calculatedTotalHours * hourlyRate,
      status: 'draft',
      comments
    });
    
    await paymentDeclaration.save();
    
    return res.status(201).json(paymentDeclaration);
  } catch (error) {
    console.error('Create payment declaration error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/payment
 * @desc    Get payment declarations for the current user
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, semesterId, startDate, endDate } = req.query;
    

    const query = { userId: req.user.id };
    
    if (status) query.status = status;
    if (semesterId) query.semesterId = semesterId;
    
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }
    

    const paymentDeclarations = await PaymentDeclaration.find(query)
      .sort({ createdAt: -1 })
      .populate('semesterId', 'name academicYear')
      .populate('approvedBy', 'firstName lastName');
    
    return res.json(paymentDeclarations);
  } catch (error) {
    console.error('Get payment declarations error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/payment/admin
 * @desc    Get all payment declarations (admin only)
 * @access  Private/Admin
 */
router.get('/admin', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { userId, status, semesterId, startDate, endDate } = req.query;
    

    const query = {};
    
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (semesterId) query.semesterId = semesterId;
    
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }
    
    const paymentDeclarations = await PaymentDeclaration.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email position')
      .populate('semesterId', 'name academicYear')
      .populate('approvedBy', 'firstName lastName');
    
    return res.json(paymentDeclarations);
  } catch (error) {
    console.error('Admin get payment declarations error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   GET /api/payment/:id
 * @desc    Get payment declaration by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id)
      .populate('semesterId', 'name academicYear')
      .populate('teachingHours')
      .populate('approvedBy', 'firstName lastName');
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    
    if (paymentDeclaration.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    return res.json(paymentDeclaration);
  } catch (error) {
    console.error('Get payment declaration by ID error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/payment/:id
 * @desc    Update payment declaration
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, semesterId, startDate, endDate, teachingHourIds, totalHours, hourlyRate, comments } = req.body;
    
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id);
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    
    if (paymentDeclaration.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    if (paymentDeclaration.status !== 'draft') {
      return res.status(400).json({ message: 'Nu puteți modifica o declarație care a fost deja trimisă sau aprobată' });
    }
    
    if (teachingHourIds && teachingHourIds.length > 0) {
      const teachingHours = await TeachingHours.find({
        _id: { $in: teachingHourIds },
        userId: req.user.id
      });
      
      if (teachingHours.length !== teachingHourIds.length) {
        return res.status(400).json({ message: 'Unele înregistrări de ore predate nu sunt valide' });
      }
      
      paymentDeclaration.teachingHours = teachingHourIds;
      
      if (!totalHours) {
        paymentDeclaration.totalHours = teachingHours.reduce((total, record) => total + record.hourCount, 0);
      }
    }
    
    if (title) paymentDeclaration.title = title;
    if (semesterId) paymentDeclaration.semesterId = semesterId;
    if (startDate) paymentDeclaration.startDate = new Date(startDate);
    if (endDate) paymentDeclaration.endDate = new Date(endDate);
    if (totalHours) paymentDeclaration.totalHours = totalHours;
    if (hourlyRate) paymentDeclaration.hourlyRate = hourlyRate;
    if (comments !== undefined) paymentDeclaration.comments = comments;
    
    paymentDeclaration.totalAmount = paymentDeclaration.totalHours * paymentDeclaration.hourlyRate;
    paymentDeclaration.updatedAt = Date.now();
    
    await paymentDeclaration.save();
    
    return res.json(paymentDeclaration);
  } catch (error) {
    console.error('Update payment declaration error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   DELETE /api/payment/:id
 * @desc    Delete payment declaration
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id);
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    
    if (paymentDeclaration.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    if (paymentDeclaration.status !== 'draft') {
      return res.status(400).json({ message: 'Nu puteți șterge o declarație care a fost deja trimisă sau aprobată' });
    }
    
    await paymentDeclaration.deleteOne();
    
    return res.json({ message: 'Declarație ștearsă cu succes' });
  } catch (error) {
    console.error('Delete payment declaration error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/payment/:id/submit
 * @desc    Submit payment declaration for approval
 * @access  Private
 */
router.put('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id);
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    
    if (paymentDeclaration.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    
    if (paymentDeclaration.status !== 'draft') {
      return res.status(400).json({ message: 'Declarația a fost deja trimisă sau aprobată' });
    }
    
    paymentDeclaration.status = 'pending';
    paymentDeclaration.submittedAt = Date.now();
    
    await paymentDeclaration.save();
    
    return res.json(paymentDeclaration);
  } catch (error) {
    console.error('Submit payment declaration error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/payment/:id/approve
 * @desc    Approve payment declaration (admin only)
 * @access  Private/Admin
 */
router.put('/:id/approve', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id);
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    
    if (paymentDeclaration.status !== 'pending') {
      return res.status(400).json({ message: 'Declarația nu este în așteptare pentru aprobare' });
    }
    
    paymentDeclaration.status = 'approved';
    paymentDeclaration.approvedBy = req.user.id;
    paymentDeclaration.approvedAt = Date.now();
    
    await paymentDeclaration.save();
    
    return res.json(paymentDeclaration);
  } catch (error) {
    console.error('Approve payment declaration error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

/**
 * @route   PUT /api/payment/:id/reject
 * @desc    Reject payment declaration (admin only)
 * @access  Private/Admin
 */
router.put('/:id/reject', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Motivul respingerii este obligatoriu' });
    }
    
    const paymentDeclaration = await PaymentDeclaration.findById(req.params.id);
    
    if (!paymentDeclaration) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    

    if (paymentDeclaration.status !== 'pending') {
      return res.status(400).json({ message: 'Declarația nu este în așteptare pentru aprobare' });
    }
    

    paymentDeclaration.status = 'rejected';
    paymentDeclaration.rejectionReason = rejectionReason;
    paymentDeclaration.rejectedBy = req.user.id;
    paymentDeclaration.rejectedAt = Date.now();
    
    await paymentDeclaration.save();
    
    return res.json(paymentDeclaration);
  } catch (error) {
    console.error('Reject payment declaration error:', error);
    return res.status(500).json({ message: 'Eroare de server' });
  }
});

module.exports = router;
