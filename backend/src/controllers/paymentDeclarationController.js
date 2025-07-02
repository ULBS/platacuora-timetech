const Calendar = require('../models/calendar.model');
const PaymentDeclaration = require('../models/payment-declaration.model');
const TeachingHours = require('../models/teaching-hours.model');
const PDFService = require('../services/pdf.service');
const DataIntegrationService = require('../services/data-integration.service');
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

/**
 * Generate PDF with enhanced features
 * POST /api/payment/:id/pdf/enhanced
 */
exports.generateEnhancedPDF = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id)
      .populate('user', 'firstName lastName email position faculty department')
      .populate('semester', 'name academicYear');

    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }

    const authorId = decl.user._id.toString();
    const isOwner = authorId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Acces interzis' });
    }

    // Enhanced PDF options from request body
    const options = {
      enhanced: true,
      includeQR: req.body.includeQR !== false,
      includeWatermark: req.body.includeWatermark === true,
      digitalSignature: req.body.digitalSignature === true,
      template: req.body.template || 'ulbs-official',
      ...req.body.options
    };

    // Add digital signature configuration if requested
    if (options.digitalSignature) {
      options.certificatePath = process.env.DEFAULT_CERTIFICATE_PATH;
      options.certificatePassword = process.env.DEFAULT_CERTIFICATE_PASSWORD;
      options.signerInfo = {
        userId: req.user.id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: req.user.role,
        organization: 'Universitatea Lucian Blaga din Sibiu'
      };
    }

    const pdfBuffer = await PDFService.buildDeclarationPDF(decl, options);

    const filename = `PO-Enhanced-${decl.academicYear}-S${decl.semester}-${decl.user.lastName}-${decl._id}.pdf`;
    
    res.status(200).set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
      'X-Enhanced-PDF': 'true',
      'X-Template': options.template,
      'X-Digital-Signature': options.digitalSignature ? 'applied' : 'none'
    });

    res.send(pdfBuffer);

  } catch (err) {
    console.error('Enhanced PDF generation error:', err);
    res.status(500).json({ 
      message: 'Eroare la generarea PDF-ului enhanced', 
      details: err.message 
    });
  }
};

/**
 * Generate batch PDFs
 * POST /api/payment/batch/pdf
 */
exports.generateBatchPDFs = async (req, res) => {
  try {
    const { declarationIds, options = {} } = req.body;

    if (!declarationIds || !Array.isArray(declarationIds)) {
      return res.status(400).json({ message: 'Lista de ID-uri este obligatorie' });
    }

    // Fetch and authorize declarations
    const declarations = await PaymentDeclaration.find({
      _id: { $in: declarationIds }
    })
    .populate('user', 'firstName lastName email position faculty department')
    .populate('semester', 'name academicYear');

    const authorizedDeclarations = declarations.filter(decl => {
      const isOwner = decl.user._id.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      return isOwner || isAdmin;
    });

    if (authorizedDeclarations.length === 0) {
      return res.status(403).json({ message: 'Nu aveți acces la declarațiile solicitate' });
    }

    const batchOptions = {
      ...options,
      enhanced: options.enhanced !== false,
      batchSize: Math.min(options.batchSize || 5, 10)
    };

    const results = await PDFService.generateBatchPDFs(authorizedDeclarations, batchOptions);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.status(200).json({
      message: 'Procesare batch finalizată',
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        totalSize: successful.reduce((sum, r) => sum + (r.size || 0), 0)
      },
      results: results.map(r => ({
        id: r.id,
        success: r.success,
        error: r.error,
        size: r.size
      }))
    });

  } catch (err) {
    console.error('Batch PDF generation error:', err);
    res.status(500).json({ 
      message: 'Eroare la generarea batch PDF', 
      details: err.message 
    });
  }
};

/**
 * Get integrated data preview for declaration
 * GET /api/payment/:id/data-preview
 */
exports.getDataPreview = async (req, res) => {
  try {
    const declarationId = req.params.id;
    
    // Since declarations are stored in localStorage (frontend), 
    // create a mock preview for demonstration
    const mockPreview = {
      declarationId: declarationId,
      period: {
        startDate: new Date().getFullYear() + '-10-01',
        endDate: new Date().getFullYear() + '-10-31'
      },
      integratedData: {
        items: [
          { type: 'lecture', hours: 10, discipline: 'Sample Course' },
          { type: 'seminar', hours: 5, discipline: 'Sample Course' }
        ]
      },
      preview: {
        totalHours: 15,
        activitiesCount: 2,
        disciplinesCount: 1,
        totalItems: 2
      },
      validation: {
        isValid: true,
        warnings: [],
        errors: []
      }
    };

    res.status(200).json(mockPreview);

  } catch (err) {
    console.error('Data preview error:', err);
    res.status(500).json({ 
      message: 'Eroare la obținerea preview-ului datelor', 
      details: err.message 
    });
  }
};
