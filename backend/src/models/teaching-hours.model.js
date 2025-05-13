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
      type: Number,      validate: {
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
      enum: ['in_editare', 'verificat'],
      default: 'in_editare',
    },
    processedInDeclaration: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

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

const TeachingHours = mongoose.model('TeachingHours', teachingHoursSchema);

module.exports = TeachingHours;
