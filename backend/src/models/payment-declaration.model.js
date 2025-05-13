const mongoose = require('mongoose');

const declarationItemSchema = new mongoose.Schema({
  postNumber: {
    type: Number,
    required: true,
  },
  postGrade: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  courseHours: {
    type: Number,
    default: 0,
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
    required: true,
    enum: ['LR', 'LE', 'MR', 'ME'],
  },
  coefficient: {
    type: Number,
    required: true,
  },
  totalHours: {
    type: Number,
    required: true,
  },
  groups: {
    type: String,
    required: true,
  },
});

const paymentDeclarationSchema = new mongoose.Schema(
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
    startDate: {
      type: Date,
      required: [true, 'Data de început este obligatorie'],
    },
    endDate: {
      type: Date,
      required: [true, 'Data de sfârșit este obligatorie'],
    },
    title: {
      type: String,
      default: function() {
        // Format: PO - Luna YYYY
        const endDate = this.endDate ? new Date(this.endDate) : new Date();
        
        const formatMonth = (date) => {
          const months = [
            'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
            'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
          ];
          return months[date.getMonth()];
        };
        
        return `PO - ${formatMonth(endDate)} ${endDate.getFullYear()}`;
      },
    },
    items: [declarationItemSchema],
    // Totals calculated from items
    totalCourseHours: {
      type: Number,
      default: 0,
    },
    totalSeminarHours: {
      type: Number,
      default: 0,
    },
    totalLabHours: {
      type: Number,
      default: 0,
    },
    totalProjectHours: {
      type: Number,
      default: 0,
    },
    totalPhysicalHours: {
      type: Number,
      default: 0,
    },
    totalConventionalHours: {
      type: Number,
      default: 0,
    },
    // Approval workflow
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved_department', 'approved_dean', 'rejected'],
      default: 'draft',
    },
    approvalDepartment: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
      comments: String,
    },
    approvalDean: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
      comments: String,
    },
    rejection: {
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectedAt: Date,
      reason: String,
    },
    // PDF generation
    pdfGenerated: {
      type: Boolean,
      default: false,
    },
    pdfUrl: String,
    signature: {
      isDigitallySigned: {
        type: Boolean,
        default: false,
      },
      signatureData: String,
      signedAt: Date,
    },  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate totals
paymentDeclarationSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Reset totals
    this.totalCourseHours = 0;
    this.totalSeminarHours = 0;
    this.totalLabHours = 0;
    this.totalProjectHours = 0;
    this.totalPhysicalHours = 0;
    this.totalConventionalHours = 0;
    
    // Calculate totals from items
    this.items.forEach(item => {
      this.totalCourseHours += item.courseHours || 0;
      this.totalSeminarHours += item.seminarHours || 0;
      this.totalLabHours += item.labHours || 0;
      this.totalProjectHours += item.projectHours || 0;
      this.totalConventionalHours += item.totalHours || 0;
    });
    
    this.totalPhysicalHours = this.totalCourseHours + this.totalSeminarHours + 
                              this.totalLabHours + this.totalProjectHours;
  }
  next();
});

// Method to generate PDF for the declaration
paymentDeclarationSchema.methods.generatePDF = async function() {
  if (this.status !== 'approved_dean') {
    throw new Error('Cannot generate PDF for declarations that are not fully approved');
  }
  
  // PDF generation logic would be implemented here
  // This will be implemented in a separate utility
  
  this.pdfGenerated = true;
  this.pdfUrl = `/declarations/pdf/${this._id}.pdf`;
  
  return await this.save();
};

const PaymentDeclaration = mongoose.model('PaymentDeclaration', paymentDeclarationSchema);

module.exports = PaymentDeclaration;
