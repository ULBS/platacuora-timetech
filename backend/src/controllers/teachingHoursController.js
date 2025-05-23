const TeachingHours = require('../models/teaching-hours.model');
const SemesterConfig = require('../models/semester-config.model');
const Calendar = require('../models/calendar.model');
const { validateRequiredFields, validateDateFields } = require('../utils/validation');
const xlsx = require('xlsx'); // You'll need to install this package: npm install xlsx
const mongoose = require('mongoose');

/**
 * Create a new teaching hours record
 * @route POST /api/teaching-hours
 * @access Private
 */
exports.createTeachingHours = async (req, res) => {
  try {
    // Add the current user's ID to the request body
    req.body.user = req.user.id;

    // Validate required fields
    const requiredFields = [
      'faculty', 'department', 'academicYear', 'semester', 
      'postNumber', 'postGrade', 'disciplineName', 'activityType', 'group', 'dayOfWeek'
    ];
    
    const validation = validateRequiredFields(req.body, requiredFields);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Câmpuri lipsă', 
        missingFields: validation.missingFields 
      });
    }
    
    // Check for duplicate record
    const duplicate = await TeachingHours.isRecordDuplicate(req.body);
    if (duplicate) {
      return res.status(409).json({ error: 'Există deja o înregistrare cu aceste date' });
    }

    // Ensure exactly one hour type has a value
    const hourTypes = [
      req.body.courseHours || 0, 
      req.body.seminarHours || 0, 
      req.body.labHours || 0, 
      req.body.projectHours || 0
    ];
    const nonZeroCount = hourTypes.filter(h => h > 0).length;
    
    if (nonZeroCount !== 1) {
      return res.status(400).json({ 
        error: 'Trebuie să specifici exact un tip de oră (curs, seminar, laborator sau proiect)' 
      });
    }
    
    // Create and save the record
    const teachingHours = new TeachingHours(req.body);
    await teachingHours.save();
    
    res.status(201).json({ 
      message: 'Înregistrare creată cu succes', 
      record: teachingHours 
    });
  } catch (err) {
    console.error('Create teaching hours error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Get all teaching hours for the current user with pagination and filtering
 * @route GET /api/teaching-hours
 * @access Private
 */
exports.getTeachingHours = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      semester, 
      academicYear, 
      faculty, 
      department,
      status,
      disciplineName,
      postNumber,
      sort = '-createdAt',
      dayOfWeek,
      oddEven
    } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    if (semester) query.semester = parseInt(semester);
    if (academicYear) query.academicYear = academicYear;
    if (faculty) query.faculty = faculty;
    if (department) query.department = department;
    if (status) query.status = status;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (oddEven) query.oddEven = oddEven;
    if (disciplineName) query.disciplineName = { $regex: disciplineName, $options: 'i' };
    if (postNumber) query.postNumber = parseInt(postNumber);
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await TeachingHours.countDocuments(query);
    
    // Execute query with pagination
    const hours = await TeachingHours
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');
    
    res.json({
      records: hours,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      totalRecords: total
    });
  } catch (err) {
    console.error('Get teaching hours error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Get a single teaching hours record by ID
 * @route GET /api/teaching-hours/:id
 * @access Private
 */
exports.getTeachingHoursById = async (req, res) => {
  try {
    const record = await TeachingHours
      .findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('paymentDeclarationId', 'number date status');
    
    if (!record) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or has admin/department head role
    if (record.user._id.toString() !== req.user.id && 
        !['admin', 'departmentHead', 'dean'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să accesați această înregistrare' });
    }
    
    res.json(record);
  } catch (err) {
    console.error('Get teaching hour by ID error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Update a teaching hours record
 * @route PUT /api/teaching-hours/:id
 * @access Private
 */
exports.updateTeachingHours = async (req, res) => {
  try {
    // Find the record
    const record = await TeachingHours.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or has admin role
    if (record.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nu aveți permisiunea să modificați această înregistrare' });
    }
    
    // Check if record is already processed in a declaration
    if (record.processedInDeclaration) {
      return res.status(400).json({ 
        error: 'Nu puteți modifica o înregistrare care a fost deja procesată într-o declarație' 
      });
    }
    
    // Update fields (only allowed fields)
    const allowedFields = [
      'faculty', 'department', 'academicYear', 'semester', 
      'postNumber', 'postGrade', 'disciplineName', 
      'courseHours', 'seminarHours', 'labHours', 'projectHours',
      'activityType', 'group', 'dayOfWeek', 'oddEven',
      'isSpecial', 'specialWeek', 'notes'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });
    
    // Set status back to in_editare if it was verified
    if (record.status === 'verificat' || record.status === 'aprobat') {
      record.status = 'in_editare';
      record.verifiedBy = null;
      record.verifiedAt = null;
    }
    
    // Save the updated record
    await record.save();
    
    res.json({ 
      message: 'Înregistrare actualizată cu succes', 
      record 
    });
  } catch (err) {
    console.error('Update teaching hour error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Delete a teaching hours record
 * @route DELETE /api/teaching-hours/:id
 * @access Private
 */
exports.deleteTeachingHours = async (req, res) => {
  try {
    const record = await TeachingHours.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }
    
    // Check if the user is the owner or has admin role
    if (record.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nu aveți permisiunea să ștergeți această înregistrare' });
    }
    
    // Check if record is already processed in a declaration
    if (record.processedInDeclaration) {
      return res.status(400).json({ 
        error: 'Nu puteți șterge o înregistrare care a fost deja procesată într-o declarație' 
      });
    }
    
    // Delete the record
    await record.deleteOne();
    
    res.status(200).json({ message: 'Înregistrare ștearsă cu succes' });
  } catch (err) {
    console.error('Delete teaching hour error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Verify a teaching hours record (for department heads)
 * @route PUT /api/teaching-hours/:id/verify
 * @access Private/DepartmentHead/Admin
 */
exports.verifyTeachingHours = async (req, res) => {
  try {
    const record = await TeachingHours.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }
    
    // Check if the user has permission to verify records
    if (!['admin', 'departmentHead', 'dean'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să verificați înregistrări' });
    }
    
    // Update the record status
    record.status = 'verificat';
    record.verifiedBy = req.user.id;
    record.verifiedAt = new Date();
    
    await record.save();
    
    res.json({ 
      message: 'Înregistrare verificată cu succes', 
      record 
    });
  } catch (err) {
    console.error('Verify teaching hour error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Reject a teaching hours record (for department heads)
 * @route PUT /api/teaching-hours/:id/reject
 * @access Private/DepartmentHead/Admin
 */
exports.rejectTeachingHours = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Motivul respingerii este obligatoriu' });
    }
    
    const record = await TeachingHours.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Înregistrare negăsită' });
    }
    
    // Check if the user has permission to reject records
    if (!['admin', 'departmentHead', 'dean'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să respingeți înregistrări' });
    }
    
    // Update the record status
    record.status = 'respins';
    record.rejectionReason = rejectionReason;
    
    await record.save();
    
    res.json({ 
      message: 'Înregistrare respinsă',
      record 
    });
  } catch (err) {
    console.error('Reject teaching hour error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Get statistics for teaching hours
 * @route GET /api/teaching-hours/statistics
 * @access Private
 */
exports.getStatistics = async (req, res) => {
  try {
    const { academicYear, semester, faculty, department } = req.query;
    
    const filters = {};
    if (academicYear) filters.academicYear = academicYear;
    if (semester) filters.semester = parseInt(semester);
    if (faculty) filters.faculty = faculty;
    if (department) filters.department = department;
    
    const stats = await TeachingHours.getHoursSummary(req.user.id, filters);
    
    res.json(stats.length > 0 ? stats[0] : {
      totalCourseHours: 0,
      totalSeminarHours: 0,
      totalLabHours: 0,
      totalProjectHours: 0,
      totalHours: 0,
      totalRecords: 0,
      verifiedRecords: 0,
      pendingRecords: 0,
      specialWeekRecords: 0,
      verifiedPercentage: 0
    });
  } catch (err) {
    console.error('Get teaching hours statistics error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

/**
 * Export teaching hours to Excel
 * @route GET /api/teaching-hours/export
 * @access Private
 */
exports.exportToExcel = async (req, res) => {
  try {
    const { academicYear, semester, faculty, department, startDate, endDate } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);
    if (faculty) query.faculty = faculty;
    if (department) query.department = department;
    
    if (startDate && endDate) {
      query.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Get records for export
    const records = await TeachingHours
      .find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email');
    
    // Format data for Excel
    const excelData = await TeachingHours.formatForExport(records);
    
    // Create a worksheet
    const ws = xlsx.utils.json_to_sheet(excelData);
    
    // Create a workbook
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Ore Predare');
    
    // Generate buffer
    const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set headers for Excel download
    res.setHeader('Content-Disposition', `attachment; filename="ore_predare_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Export teaching hours error:', err);
    res.status(500).json({ error: 'Eroare la exportul datelor' });
  }
};

/**
 * Import teaching hours from Excel
 * @route POST /api/teaching-hours/import
 * @access Private
 */
exports.importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Niciun fișier încărcat' });
    }
    
    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    
    // Parse and validate import data
    const { parsedData, errors } = TeachingHours.parseImportData(excelData);
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Erori în datele importate', 
        details: errors 
      });
    }
    
    // Add user ID to all records
    const recordsWithUser = parsedData.map(record => ({
      ...record,
      user: req.user.id,
      status: 'in_editare'
    }));
    
    // Check for duplicates before importing
    const importSummary = {
      total: recordsWithUser.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    // Use transaction to ensure data integrity
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (const record of recordsWithUser) {
        // Check for duplicate
        const duplicate = await TeachingHours.isRecordDuplicate(record);
        
        if (duplicate) {
          importSummary.skipped++;
          continue;
        }
        
        try {
          const newRecord = new TeachingHours(record);
          await newRecord.save({ session });
          importSummary.imported++;
        } catch (err) {
          importSummary.errors.push(`Eroare la înregistrarea: ${JSON.stringify(record)}: ${err.message}`);
        }
      }
      
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
    
    res.json({ 
      message: 'Import finalizat', 
      summary: importSummary 
    });
  } catch (err) {
    console.error('Import teaching hours error:', err);
    res.status(500).json({ error: 'Eroare la importul datelor' });
  }
};

/**
 * Validate teaching hours against calendar
 * @route POST /api/teaching-hours/validate
 * @access Private
 */
exports.validateTeachingHours = async (req, res) => {
  try {
    const { academicYear, semester } = req.body;
    
    if (!academicYear || !semester) {
      return res.status(400).json({ error: 'Anul academic și semestrul sunt obligatorii' });
    }
    
    // Get calendar for the specified academic year and semester
    const calendar = await Calendar.findOne({ academicYear, semester });
    
    if (!calendar) {
      return res.status(404).json({ error: 'Nu există un calendar pentru anul academic și semestrul specificat' });
    }
    
    // Get teaching hours for the user, academic year and semester
    const teachingHours = await TeachingHours.find({
      user: req.user.id,
      academicYear,
      semester: parseInt(semester)
    });
    
    const validationResults = [];
    
    for (const record of teachingHours) {
      const validationResult = await record.validateAgainstCalendar(Calendar);
      
      validationResults.push({
        id: record._id,
        disciplineName: record.disciplineName,
        dayOfWeek: record.dayOfWeek,
        oddEven: record.oddEven,
        isSpecial: record.isSpecial,
        specialWeek: record.specialWeek,
        validationResult
      });
    }
    
    res.json({
      validationResults,
      totalRecords: teachingHours.length,
      validRecords: validationResults.filter(r => r.validationResult.valid).length,
      invalidRecords: validationResults.filter(r => !r.validationResult.valid).length
    });
  } catch (err) {
    console.error('Validate teaching hours error:', err);
    res.status(500).json({ error: 'Eroare la validarea datelor' });
  }
};

/**
 * Bulk update teaching hours (change status, verify, reject)
 * @route PUT /api/teaching-hours/bulk-update
 * @access Private/Admin/DepartmentHead
 */
exports.bulkUpdateTeachingHours = async (req, res) => {
  try {
    const { ids, action, rejectionReason } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Trebuie să specifici cel puțin o înregistrare' });
    }
    
    if (!action || !['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Acțiunea specificată nu este validă' });
    }
    
    // Check if the user has permission to perform the action
    if (!['admin', 'departmentHead', 'dean'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Nu aveți permisiunea să efectuați această acțiune' });
    }
    
    // If action is reject, rejection reason is required
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ error: 'Motivul respingerii este obligatoriu' });
    }
    
    // Prepare update data
    const updateData = {};
    if (action === 'verify') {
      updateData.status = 'verificat';
      updateData.verifiedBy = req.user.id;
      updateData.verifiedAt = new Date();
    } else if (action === 'reject') {
      updateData.status = 'respins';
      updateData.rejectionReason = rejectionReason;
    }
    
    // Perform bulk update
    const result = await TeachingHours.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );
    
    res.json({
      message: action === 'verify' ? 'Înregistrări verificate cu succes' : 'Înregistrări respinse cu succes',
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (err) {
    console.error('Bulk update teaching hours error:', err);
    res.status(500).json({ error: 'Eroare de server' });
  }
};

