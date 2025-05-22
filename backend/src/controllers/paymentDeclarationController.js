const PaymentDeclaration = require('../models/payment-declaration.model');
const TeachingHours      = require('../models/teaching-hours.model');

/**
 * Create new payment declaration
 * POST /api/payment
 */
exports.createPaymentDeclaration = async (req, res) => {
  try {
    const {
      title,
      semesterId,
      startDate,
      endDate,
      teachingHourIds,
      totalHours,
      hourlyRate,
      comments
    } = req.body;

    if (!teachingHourIds || !teachingHourIds.length) {
      return res
        .status(400)
        .json({ message: 'Trebuie să selectați cel puțin o înregistrare de ore predate' });
    }

    const teachingHours = await TeachingHours.find({
      _id:   { $in: teachingHourIds },
      userId: req.user.id
    });
    if (teachingHours.length !== teachingHourIds.length) {
      return res
        .status(400)
        .json({ message: 'Unele înregistrări de ore predate nu sunt valide' });
    }

    const calcTotalHours = totalHours ||
      teachingHours.reduce((sum, rec) => sum + rec.hourCount, 0);

    const paymentDeclaration = new PaymentDeclaration({
      userId:        req.user.id,
      title,
      semesterId,
      startDate:     new Date(startDate),
      endDate:       new Date(endDate),
      teachingHours: teachingHourIds,
      totalHours:    calcTotalHours,
      hourlyRate,
      totalAmount:   calcTotalHours * hourlyRate,
      status:        'draft',
      comments
    });

    await paymentDeclaration.save();
    res.status(201).json(paymentDeclaration);
  } catch (err) {
    console.error('Create payment declaration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get payment declarations for the current user
 * GET /api/payment
 */
exports.getPaymentDeclarations = async (req, res) => {
  try {
    const { status, semesterId, startDate, endDate } = req.query;
    const query = { userId: req.user.id };

    if (status)     query.status     = status;
    if (semesterId) query.semesterId = semesterId;
    if (startDate || endDate) {
      query.startDate = {};
      query.endDate   = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate)   query.endDate.$lte   = new Date(endDate);
    }

    const paymentDeclarations = await PaymentDeclaration
      .find(query)
      .sort({ createdAt: -1 })
      .populate('semesterId', 'name academicYear')
      .populate('approvedBy',  'firstName lastName');

    res.json(paymentDeclarations);
  } catch (err) {
    console.error('Get payment declarations error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Admin: Get all payment declarations
 * GET /api/payment/admin
 */
exports.adminGetPaymentDeclarations = async (req, res) => {
  try {
    const { userId, status, semesterId, startDate, endDate } = req.query;
    const query = {};

    if (userId)     query.userId     = userId;
    if (status)     query.status     = status;
    if (semesterId) query.semesterId = semesterId;
    if (startDate || endDate) {
      query.startDate = {};
      query.endDate   = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate)   query.endDate.$lte   = new Date(endDate);
    }

    const paymentDeclarations = await PaymentDeclaration
      .find(query)
      .sort({ createdAt: -1 })
      .populate('userId',       'firstName lastName email position')
      .populate('semesterId',   'name academicYear')
      .populate('approvedBy',    'firstName lastName');

    res.json(paymentDeclarations);
  } catch (err) {
    console.error('Admin get payment declarations error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Get payment declaration by ID
 * GET /api/payment/:id
 */
exports.getPaymentDeclarationById = async (req, res) => {
  try {
    const decl = await PaymentDeclaration
      .findById(req.params.id)
      .populate('semesterId',   'name academicYear')
      .populate('teachingHours')
      .populate('approvedBy',    'firstName lastName');

    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    res.json(decl);
  } catch (err) {
    console.error('Get payment declaration by ID error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Update payment declaration
 * PUT /api/payment/:id
 */
exports.updatePaymentDeclaration = async (req, res) => {
  try {
    const {
      title, semesterId, startDate, endDate,
      teachingHourIds, totalHours, hourlyRate, comments
    } = req.body;

    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    if (decl.status !== 'draft') {
      return res.status(400).json({ message: 'Nu puteți modifica declarația în stadiul curent' });
    }

    if (teachingHourIds?.length) {
      const hours = await TeachingHours.find({
        _id:    { $in: teachingHourIds },
        userId: req.user.id
      });
      if (hours.length !== teachingHourIds.length) {
        return res.status(400).json({ message: 'Ore predate invalide' });
      }
      decl.teachingHours = teachingHourIds;
      decl.totalHours    = totalHours || hours.reduce((s, r) => s + r.hourCount, 0);
    }

    if (title)      decl.title      = title;
    if (semesterId) decl.semesterId = semesterId;
    if (startDate)  decl.startDate  = new Date(startDate);
    if (endDate)    decl.endDate    = new Date(endDate);
    if (hourlyRate) decl.hourlyRate = hourlyRate;
    if (comments !== undefined) decl.comments = comments;

    decl.totalAmount = decl.totalHours * decl.hourlyRate;
    decl.updatedAt   = Date.now();

    await decl.save();
    res.json(decl);
  } catch (err) {
    console.error('Update payment declaration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Eroare de server' });
  }
};


/**
 * Delete payment declaration
 * DELETE /api/payment/:id
 */
exports.deletePaymentDeclaration = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    if (decl.status !== 'draft') {
      return res.status(400).json({ message: 'Nu puteți șterge declarația în stadiul curent' });
    }
    await decl.deleteOne();
    res.json({ message: 'Declarație ștearsă cu succes' });
  } catch (err) {
    console.error('Delete payment declaration error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Submit payment declaration for approval
 * PUT /api/payment/:id/submit
 */
exports.submitPaymentDeclaration = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    if (decl.status !== 'draft') {
      return res.status(400).json({ message: 'Declarația nu poate fi trimisă în stadiul curent' });
    }
    decl.status      = 'pending';
    decl.submittedAt = Date.now();
    await decl.save();
    res.json(decl);
  } catch (err) {
    console.error('Submit payment declaration error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Approve payment declaration (admin only)
 * PUT /api/payment/:id/approve
 */
exports.approvePaymentDeclaration = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.status !== 'pending') {
      return res.status(400).json({ message: 'Declarația nu este în așteptare' });
    }
    decl.status      = 'approved';
    decl.approvedBy  = req.user.id;
    decl.approvedAt  = Date.now();
    await decl.save();
    res.json(decl);
  } catch (err) {
    console.error('Approve payment declaration error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Reject payment declaration (admin only)
 * PUT /api/payment/:id/reject
 */
exports.rejectPaymentDeclaration = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Motivul respingerii este obligatoriu' });
    }
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    if (decl.status !== 'pending') {
      return res.status(400).json({ message: 'Declarația nu este în așteptare' });
    }
    decl.status          = 'rejected';
    decl.rejectionReason = rejectionReason;
    decl.rejectedBy      = req.user.id;
    decl.rejectedAt      = Date.now();
    await decl.save();
    res.json(decl);
  } catch (err) {
    console.error('Reject payment declaration error:', err);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

/**
 * Generate PDF for a payment declaration
 * POST /api/payment/:id/generate-pdf
 */
exports.generatePDF = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('semesterId', 'name academicYear')
      .populate('teachingHours');
    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }
    // Poate orice rol user/admin poate genera propriul PDF:
    if (decl.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acces interzis' });
    }
    const pdfResult = await decl.generatePDF();
    res.json(pdfResult);
  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ message: err.message });
  }
};