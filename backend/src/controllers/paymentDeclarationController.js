const Calendar = require('../models/calendar.model');
const PaymentDeclaration = require('../models/payment-declaration.model');
const TeachingHours = require('../models/teaching-hours.model');
const PDFService = require('../services/pdf.service');
const fs   = require('fs');
const path = require('path');

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
      _id: { $in: teachingHourIds },
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
      userId: req.user.id,
      title,
      semesterId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      teachingHours: teachingHourIds,
      totalHours: calcTotalHours,
      hourlyRate,
      totalAmount: calcTotalHours * hourlyRate,
      status: 'draft',
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

    if (status) query.status = status;
    if (semesterId) query.semesterId = semesterId;
    if (startDate || endDate) {
      query.startDate = {};
      query.endDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.endDate.$lte = new Date(endDate);
    }

    const paymentDeclarations = await PaymentDeclaration
      .find(query)
      .sort({ createdAt: -1 })
      .populate('semesterId', 'name academicYear')
      .populate('approvedBy', 'firstName lastName');

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

    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (semesterId) query.semesterId = semesterId;
    if (startDate || endDate) {
      query.startDate = {};
      query.endDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.endDate.$lte = new Date(endDate);
    }

    const paymentDeclarations = await PaymentDeclaration
      .find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email position')
      .populate('semesterId', 'name academicYear')
      .populate('approvedBy', 'firstName lastName');

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
      .populate('semesterId', 'name academicYear')
      .populate('teachingHours')
      .populate('approvedBy', 'firstName lastName');

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
        _id: { $in: teachingHourIds },
        userId: req.user.id
      });
      if (hours.length !== teachingHourIds.length) {
        return res.status(400).json({ message: 'Ore predate invalide' });
      }
      decl.teachingHours = teachingHourIds;
      decl.totalHours = totalHours || hours.reduce((s, r) => s + r.hourCount, 0);
    }

    if (title) decl.title = title;
    if (semesterId) decl.semesterId = semesterId;
    if (startDate) decl.startDate = new Date(startDate);
    if (endDate) decl.endDate = new Date(endDate);
    if (hourlyRate) decl.hourlyRate = hourlyRate;
    if (comments !== undefined) decl.comments = comments;

    decl.totalAmount = decl.totalHours * decl.hourlyRate;
    decl.updatedAt = Date.now();

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
 * Generate a payment order (PO) for a verified calendar
 * POST /api/payment/generate/:calendarId
 */
exports.generatePO = async (req, res) => {
  try {
    const calendarId = req.params.id;

    const cal = await Calendar.findById(calendarId);
    if (!cal) {
      return res.status(404).json({ message: 'Calendar negăsit' });
    }
    if (cal.status !== 'verificat') {
      return res.status(400).json({ message: 'Calendarul trebuie să fie în stare "verificat" pentru a genera PO' });
    }
    const userId = cal.user.toString();

    const teachingRecords = await TeachingHours.find({
      academicYear: cal.academicYear,
      semester: cal.semester,
      faculty: cal.faculty,
      status: { $in: ['verificat', 'aprobat'] }
    });
    if (!teachingRecords.length) {
      return res.status(400).json({ message: 'Nu există ore predate verificate pentru acest calendar' });
    }

    const items = [];
    cal.days.forEach(day => {
      if (!day.isWorkingDay || day.isHoliday) return;
      teachingRecords.forEach(r => {
        const matches = r.isSpecial
          ? r.specialWeek === day.semesterWeek && r.dayOfWeek === day.dayOfWeek
          : (!r.oddEven || r.oddEven === day.oddEven) && r.dayOfWeek === day.dayOfWeek;
        if (matches) {
          items.push({
            postNumber: r.postNumber,
            postGrade: r.postGrade,
            date: day.date,
            courseHours: r.courseHours || 0,
            seminarHours: r.seminarHours || 0,
            labHours: r.labHours || 0,
            projectHours: r.projectHours || 0,
            activityType: r.activityType,
            coefficient: 1,
            totalHours: (r.courseHours || 0) + (r.seminarHours || 0) + (r.labHours || 0) + (r.projectHours || 0),
            groups: r.group
          });
        }
      });
    });
    if (!items.length) {
      return res.status(400).json({ message: 'Niciun element de declarație generat pe baza calendarului și orelor' });
    }

    const decl = new PaymentDeclaration({
      user: userId,
      faculty: cal.faculty,
      department: teachingRecords[0].department,
      academicYear: cal.academicYear,
      semester: cal.semester,
      startDate: cal.startDate,
      endDate: cal.endDate,
      items,
      status: 'draft'
    });
    await decl.save();

    try {
      await decl.generatePDF();
    } catch (pdfErr) {
      console.warn('PDF generation skipped:', pdfErr.message);
    }

    return res.status(201).json(decl);
  } catch (err) {
    console.error('Generate PO error:', err);
    return res.status(500).json({ message: 'Eroare la generarea declarației de plată' });
  }
};

 /**
 * GET /api/payment/all
 * Returns all payment declarations for the user, if none found, fallback to all POs
 */
exports.getAllPO = async (req, res) => {
  try {
    let all = await PaymentDeclaration.find({ user: req.user.id }).sort({ createdAt: -1 });
    if (!all.length) {
      ///Numai pentru testing, remove later
      all = await PaymentDeclaration.find().sort({ createdAt: -1 });
    }
    res.json(all);
  } catch (err) {
    console.error('Get all POs error:', err);
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
      .populate('user', 'firstName lastName email')
      .populate('semester', 'name academicYear');
    if (!decl) return res.status(404).json({ message: 'Declarație de plată negăsită' });

    const isOwner = decl.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Acces interzis' });

    const pdfBuffer = await PDFService.buildDeclarationPDF(decl);

    const outDir  = path.join(__dirname, '../../public/pdfs');
    const outFile = `po-${decl._id}.pdf`;
    const outPath = path.join(outDir, outFile);

    await fs.promises.mkdir(outDir, { recursive: true });

    await fs.promises.writeFile(outPath, pdfBuffer);
    decl.pdfGenerated = true;
    decl.pdfUrl       = `/pdfs/${outFile}`;
    await decl.save();

    res.json({ pdfUrl: decl.pdfUrl });

  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ message: err.message });
  }
};

// /**
//  * Submit payment declaration for approval
//  * PUT /api/payment/:id/submit
//  */
// exports.submitPaymentDeclaration = async (req, res) => {
//   try {
//     const decl = await PaymentDeclaration.findById(req.params.id);
//     if (!decl) {
//       return res.status(404).json({ message: 'Declarație de plată negăsită' });
//     }
//     if (decl.userId.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Acces interzis' });
//     }
//     if (decl.status !== 'draft') {
//       return res.status(400).json({ message: 'Declarația nu poate fi trimisă în stadiul curent' });
//     }
//     decl.status      = 'pending';
//     decl.submittedAt = Date.now();
//     await decl.save();
//     res.json(decl);
//   } catch (err) {
//     console.error('Submit payment declaration error:', err);
//     res.status(500).json({ message: 'Eroare de server' });
//   }
// };

// /**
//  * Approve payment declaration (admin only)
//  * PUT /api/payment/:id/approve
//  */
// exports.approvePaymentDeclaration = async (req, res) => {
//   try {
//     const decl = await PaymentDeclaration.findById(req.params.id);
//     if (!decl) {
//       return res.status(404).json({ message: 'Declarație de plată negăsită' });
//     }
//     if (decl.status !== 'pending') {
//       return res.status(400).json({ message: 'Declarația nu este în așteptare' });
//     }
//     decl.status      = 'approved';
//     decl.approvedBy  = req.user.id;
//     decl.approvedAt  = Date.now();
//     await decl.save();
//     res.json(decl);
//   } catch (err) {
//     console.error('Approve payment declaration error:', err);
//     res.status(500).json({ message: 'Eroare de server' });
//   }
// };

// /**
//  * Reject payment declaration (admin only)
//  * PUT /api/payment/:id/reject
//  */
// exports.rejectPaymentDeclaration = async (req, res) => {
//   try {
//     const { rejectionReason } = req.body;
//     if (!rejectionReason) {
//       return res.status(400).json({ message: 'Motivul respingerii este obligatoriu' });
//     }
//     const decl = await PaymentDeclaration.findById(req.params.id);
//     if (!decl) {
//       return res.status(404).json({ message: 'Declarație de plată negăsită' });
//     }
//     if (decl.status !== 'pending') {
//       return res.status(400).json({ message: 'Declarația nu este în așteptare' });
//     }
//     decl.status          = 'rejected';
//     decl.rejectionReason = rejectionReason;
//     decl.rejectedBy      = req.user.id;
//     decl.rejectedAt      = Date.now();
//     await decl.save();
//     res.json(decl);
//   } catch (err) {
//     console.error('Reject payment declaration error:', err);
//     res.status(500).json({ message: 'Eroare de server' });
//   }
// };

// Approve or Reject PO by admin
