const mongoose = require('mongoose');

const teachingHoursSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Utilizatorul este obligatoriu'],
    },
    faculty: {
      type: String,
      required: [true, 'Facultatea este obligatorie'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Departamentul este obligatoriu'],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Anul academic este obligatoriu'],
      trim: true,
      match: [/^\d{4}\/\d{4}$/, 'Formatul anului academic este incorect (ex: 2023/2024)'],
    },
    semester: {
      type: Number,
      required: [true, 'Semestrul este obligatoriu'],
      enum: [1, 2],
    },
    postNumber: {
      type: Number,
      required: [true, 'Numărul postului este obligatoriu'],
      min: [1, 'Numărul postului trebuie să fie cel puțin 1'],
    },
    postGrade: {
      type: String,
      required: [true, 'Gradul postului este obligatoriu'],
      enum: ['Prof', 'Conf', 'Lect', 'Asist', 'Drd'],
    },
    disciplineName: {
      type: String,
      required: [true, 'Numele disciplinei este obligatoriu'],
      trim: true
    },
    courseHours: {
      type: Number,
      default: 0,
      validate: {
        validator: function(v) {
          // Ensure exactly one of the hour types is non-zero
          const total = (v || 0) + (this.seminarHours || 0) + (this.labHours || 0) + (this.projectHours || 0);
          const nonZeroCount = [v, this.seminarHours, this.labHours, this.projectHours].filter(h => h > 0).length;
          return nonZeroCount === 1 && total > 0;
        },
        message: 'Exact unul dintre tipurile de ore (curs, seminar, laborator, proiect) trebuie să fie nenul'
      }
    },
    seminarHours: {
      type: Number,
      default: 0,
    },
    labHours: {
      type: Number,
      default: 0,
    },
    projectHours: {
      type: Number,
      default: 0,
    },
    activityType: {
      type: String,
      required: [true, 'Tipul activității este obligatoriu'],
      enum: ['LR', 'LE', 'MR', 'ME'], // LR = Licență română, LE = Licență engleză, MR = Master română, ME = Master engleză
    },
    group: {
      type: String,
      required: [true, 'Formația este obligatorie'],
      trim: true,
    },
    dayOfWeek: {
      type: String,
      required: [true, 'Ziua săptămânii este obligatorie'],
      enum: ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'],
    },
    oddEven: {
      type: String,
      enum: ['', 'Par', 'Impar'],
      default: '',
    },
    // For special weeks (medicine faculty)
    isSpecial: {
      type: Boolean,
      default: false,
    },
    specialWeek: {
      type: String,
      validate: {
        validator: function(v) {
          return !this.isSpecial || (v && v.match(/^S\d{2}$/));
        },
        message: 'Formatul săptămânii speciale este incorect (ex: S15, S16)'
      }
    },
    totalHours: {
      type: Number,
      validate: {
        validator: function(v) {
          if (!this.isSpecial) return true;
          
          const hourPerWeek = this.courseHours || this.seminarHours || this.labHours || this.projectHours;
          return v <= hourPerWeek * 14; // Maximum 14 weeks in a semester
        },
        message: 'Numărul total de ore nu poate depăși numărul de ore per săptămână înmulțit cu 14'
      }
    },
    status: {
      type: String,
      enum: ['in_editare', 'verificat', 'aprobat', 'respins'],
      default: 'in_editare',
    },
    processedInDeclaration: {
      type: Boolean,
      default: false,
    },
    paymentDeclarationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentDeclaration',
      default: null
    },
    notes: {
      type: String,
      trim: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for activity type full name
teachingHoursSchema.virtual('activityTypeFull').get(function() {
  const types = {
    'LR': 'Licență Română',
    'LE': 'Licență Engleză',
    'MR': 'Master Română',
    'ME': 'Master Engleză'
  };
  return types[this.activityType] || this.activityType;
});

// Virtual for the activity hour type
teachingHoursSchema.virtual('hourType').get(function() {
  if (this.courseHours > 0) return 'Curs';
  if (this.seminarHours > 0) return 'Seminar';
  if (this.labHours > 0) return 'Laborator';
  if (this.projectHours > 0) return 'Proiect';
  return 'Nedefinit';
});

// Custom validator to ensure only one type of hours is non-zero
teachingHoursSchema.pre('validate', function(next) {
  // Ensure exactly one of the hour types is non-zero
  const hourTypes = [this.courseHours, this.seminarHours, this.labHours, this.projectHours];
  const nonZeroCount = hourTypes.filter(h => h > 0).length;
  
  if (nonZeroCount !== 1) {
    this.invalidate('courseHours', 'Exact unul dintre tipurile de ore (curs, seminar, laborator, proiect) trebuie să fie nenul');
  }
  
  // Validate numeric values
  if (this.postNumber && (!Number.isInteger(this.postNumber) || this.postNumber < 1)) {
    this.invalidate('postNumber', 'Numărul postului trebuie să fie un număr întreg pozitiv');
  }
  
  next();
});

// Function to check if a teaching hour record with the same key attributes already exists
teachingHoursSchema.statics.isRecordDuplicate = async function(data) {
  return await this.findOne({
    user: data.user,
    postNumber: data.postNumber,
    dayOfWeek: data.dayOfWeek,
    oddEven: data.oddEven,
    group: data.group,
    // Check which hour type is non-zero
    ...(data.courseHours > 0 ? { courseHours: { $gt: 0 } } : {}),
    ...(data.seminarHours > 0 ? { seminarHours: { $gt: 0 } } : {}),
    ...(data.labHours > 0 ? { labHours: { $gt: 0 } } : {}),
    ...(data.projectHours > 0 ? { projectHours: { $gt: 0 } } : {}),
  });
};

// Get hours summary for a user and time period
teachingHoursSchema.statics.getHoursSummary = async function(userId, filters = {}) {
  const query = { user: userId };
  
  // Apply additional filters
  if (filters.semester) query.semester = filters.semester;
  if (filters.academicYear) query.academicYear = filters.academicYear;
  if (filters.faculty) query.faculty = filters.faculty;
  if (filters.department) query.department = filters.department;
  if (filters.startDate && filters.endDate) {
    query.createdAt = { 
      $gte: new Date(filters.startDate), 
      $lte: new Date(filters.endDate) 
    };
  }
  
  return await this.aggregate([
    { $match: query },
    { $group: {
      _id: null,
      totalCourseHours: { $sum: "$courseHours" },
      totalSeminarHours: { $sum: "$seminarHours" },
      totalLabHours: { $sum: "$labHours" },
      totalProjectHours: { $sum: "$projectHours" },
      totalRecords: { $sum: 1 },
      verifiedRecords: { 
        $sum: { 
          $cond: [{ $eq: ["$status", "verificat"] }, 1, 0] 
        } 
      },
      pendingRecords: { 
        $sum: { 
          $cond: [{ $eq: ["$status", "in_editare"] }, 1, 0] 
        } 
      },
      specialWeekRecords: {
        $sum: {
          $cond: [{ $eq: ["$isSpecial", true] }, 1, 0]
        }
      }
    }},
    { $project: {
      _id: 0,
      totalCourseHours: 1,
      totalSeminarHours: 1,
      totalLabHours: 1,
      totalProjectHours: 1,
      totalHours: { 
        $add: ["$totalCourseHours", "$totalSeminarHours", "$totalLabHours", "$totalProjectHours"] 
      },
      totalRecords: 1,
      verifiedRecords: 1,
      pendingRecords: 1,
      specialWeekRecords: 1,
      verifiedPercentage: {
        $multiply: [
          { $divide: ["$verifiedRecords", "$totalRecords"] },
          100
        ]
      }
    }}
  ]);
};

// Format teaching hours data for Excel export
teachingHoursSchema.statics.formatForExport = async function(records) {
  // Map records to Excel-friendly format
  return records.map(record => ({
    'Facultate': record.faculty,
    'Departament': record.department,
    'An academic': record.academicYear,
    'Semestru': record.semester,
    'Nr. post': record.postNumber,
    'Grad post': record.postGrade,
    'Disciplină': record.disciplineName,
    'Curs': record.courseHours || 0,
    'Seminar': record.seminarHours || 0,
    'Laborator': record.labHours || 0,
    'Proiect': record.projectHours || 0,
    'Tip activitate': record.activityTypeFull,
    'Formație': record.group,
    'Zi': record.dayOfWeek,
    'Par/Impar': record.oddEven || 'Toate',
    'Săptămână specială': record.isSpecial ? record.specialWeek : '',
    'Status': record.status,
    'Procesat în declarație': record.processedInDeclaration ? 'Da' : 'Nu',
    'Data creare': record.createdAt ? new Date(record.createdAt).toLocaleDateString('ro-RO') : '',
    'Data actualizare': record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('ro-RO') : '',
    'Note': record.notes || ''
  }));
};

// Parse Excel data for import
teachingHoursSchema.statics.parseImportData = function(excelData) {
  const fieldMapping = {
    'Facultate': 'faculty',
    'Departament': 'department',
    'An academic': 'academicYear',
    'Semestru': 'semester',
    'Nr. post': 'postNumber',
    'Grad post': 'postGrade',
    'Disciplină': 'disciplineName',
    'Curs': 'courseHours',
    'Seminar': 'seminarHours',
    'Laborator': 'labHours',
    'Proiect': 'projectHours',
    'Tip activitate': 'activityType',
    'Formație': 'group',
    'Zi': 'dayOfWeek',
    'Par/Impar': 'oddEven',
    'Săptămână specială': 'specialWeek',
    'Note': 'notes'
  };
  
  // Convert activity type from full name to code
  const activityTypeCodes = {
    'Licență Română': 'LR',
    'Licență Engleză': 'LE',
    'Master Română': 'MR',
    'Master Engleză': 'ME'
  };
  
  const parsedData = [];
  let errors = [];
  
  excelData.forEach((row, index) => {
    const parsedRow = {};
    let rowHasError = false;
    
    // Map Excel column names to model field names
    Object.keys(fieldMapping).forEach(excelField => {
      const modelField = fieldMapping[excelField];
      let value = row[excelField];
      
      // Type conversions and validations
      if (modelField === 'postNumber' || modelField === 'semester') {
        value = parseInt(value);
        if (isNaN(value)) {
          errors.push(`Rândul ${index + 1}: Valoarea pentru ${excelField} trebuie să fie un număr.`);
          rowHasError = true;
        }
      } else if (['courseHours', 'seminarHours', 'labHours', 'projectHours'].includes(modelField)) {
        value = parseFloat(value || 0);
        if (isNaN(value)) value = 0;
      } else if (modelField === 'activityType' && value) {
        // Convert full name to code
        value = activityTypeCodes[value] || value;
      } else if (modelField === 'specialWeek' && value) {
        parsedRow.isSpecial = true;
      }
      
      parsedRow[modelField] = value;
    });
    
    // Verify that we have exactly one non-zero hour type
    const hourTypes = [
      parsedRow.courseHours || 0, 
      parsedRow.seminarHours || 0, 
      parsedRow.labHours || 0, 
      parsedRow.projectHours || 0
    ];
    const nonZeroCount = hourTypes.filter(h => h > 0).length;
    
    if (nonZeroCount !== 1) {
      errors.push(`Rândul ${index + 1}: Trebuie să fie exact un singur tip de oră (curs, seminar, laborator sau proiect) cu valoare nenulă.`);
      rowHasError = true;
    }
    
    if (!rowHasError) parsedData.push(parsedRow);
  });
  
  return { parsedData, errors };
};

// Validate teaching hours against calendar
teachingHoursSchema.methods.validateAgainstCalendar = async function(Calendar) {
  // This method would validate that the teaching hour entry
  // corresponds to a valid working day in the calendar
  
  // Implementation depends on Calendar model structure
  // This is a placeholder for the logic
  return { valid: true, message: 'Valid' };
};

const TeachingHours = mongoose.model('TeachingHours', teachingHoursSchema);

module.exports = TeachingHours;
