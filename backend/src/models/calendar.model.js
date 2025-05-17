const mongoose = require('mongoose');

const calendarDaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'],
  },
  isWorkingDay: {
    type: Boolean,
    default: true,
  },
  oddEven: {
    type: String,
    enum: ['', 'Par', 'Impar'],
    default: '',
  },
  semesterWeek: {
    type: String, // S01, S02, etc.
    default: '',
  },
  isHoliday: {
    type: Boolean,
    default: false,
  },
  holidayName: {
    type: String,
    default: '',
  },
});

const calendarSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Utilizatorul este obligatoriu'],
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
    faculty: {
      type: String,
      required: [true, 'Facultatea este obligatorie'],
      trim: true,
    },    startDate: {
      type: Date,
      required: [true, 'Data de început este obligatorie'],
    },
    endDate: {
      type: Date,
      required: [true, 'Data de sfârșit este obligatorie'],
    },
    days: [calendarDaySchema],
    status: {
      type: String,
      enum: ['in_editare', 'verificat'],
      default: 'in_editare',
    },
    title: {
      type: String,
      default: function() {
        // Format: Calendar - Luna YYYY
        const startDate = this.startDate ? new Date(this.startDate) : new Date();
        const endDate = this.endDate ? new Date(this.endDate) : new Date();
        
        const formatMonth = (date) => {
          const months = [
            'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
            'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
          ];
          return months[date.getMonth()];
        };
        
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          return `Calendar - ${formatMonth(startDate)} ${startDate.getFullYear()}`;
        } else {
          return `Calendar - ${formatMonth(startDate)} - ${formatMonth(endDate)} ${startDate.getFullYear()}`;
        }
      },
    },
  },
  {
    timestamps: true,
  }
);

// Custom validator to check if end date is after start date
calendarSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'Data de sfârșit trebuie să fie după data de început');
  }
  
  // Check if the range is not too large (max 180 days)
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 180) {
    this.invalidate('endDate', 'Intervalul de date nu poate depăși 180 de zile');
  }
  
  next();
});

// Static method to import holidays from public API
calendarSchema.statics.importHolidays = async function(year) {
  try {
    // Fetch holidays from the API for the specified year
    const response = await fetch(`https://zilelibere.webventure.ro/api/${year}`);

    // Check if the response is okay
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays for year ${year}: ${response.statusText}`);
    }

    const holidays = await response.json();

    // Map the response to the desired format
    return holidays.map(holiday => ({
      date: new Date(holiday.date),
      isWorkingDay: false,
      isHoliday: true,
      holidayName: holiday.name
    }));
  } catch (error) {
    console.error('Error importing holidays:', error);
    throw error;
  }
};

const Calendar = mongoose.model('Calendar', calendarSchema);

module.exports = Calendar;
