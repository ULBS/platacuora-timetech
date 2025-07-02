const mongoose = require('mongoose');

const semesterWeekSchema = new mongoose.Schema({
  weekNumber: {
    type: String, // S01, S02, etc.
    required: [true, 'Numărul săptămânii este obligatoriu'],
    match: [/^S\d{2}$/, 'Formatul numărului săptămânii este incorect (ex: S01, S02)'],
  },
  startDate: {
    type: Date,
    required: [true, 'Data de început a săptămânii este obligatorie'],
  },
  weekType: {
    type: String,
    enum: ['Par', 'Impar'],
    required: [true, 'Tipul săptămânii (Par/Impar) este obligatoriu'],
  },
});

const semesterConfigSchema = new mongoose.Schema(
  {
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
    faculty: {
      type: String,
      required: [true, 'Facultatea este obligatorie'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Data de început a semestrului este obligatorie'],
    },
    endDate: {
      type: Date,
      required: [true, 'Data de sfârșit a semestrului este obligatorie'],
    },
    weeks: [semesterWeekSchema],
    // For Faculty of Medicine - special cases
    isMedicine: {
      type: Boolean,
      default: false,
    },
    specialWeeks: {
      type: [{
        weekNumber: String, // S15, S16
        startDate: Date,
        weekType: {
          type: String,
          enum: ['Par', 'Impar'],
        },
      }],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);



// Custom validator to check if end date is after start date
semesterConfigSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'Data de sfârșit trebuie să fie după data de început');
  }
  next();
});

// Compound index to ensure unique semester configurations per faculty and academic year/semester
semesterConfigSchema.index({ faculty: 1, academicYear: 1, semester: 1 }, { unique: true });

const SemesterConfiguration = mongoose.model('SemesterConfiguration', semesterConfigSchema);

module.exports = SemesterConfiguration;
