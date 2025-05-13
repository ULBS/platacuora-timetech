const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Numele departamentului este obligatoriu'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Codul departamentului este obligatoriu'],
      trim: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Facultatea este obligatorie'],
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Șeful de departament este obligatoriu'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Create a compound index to ensure unique department codes within a faculty
    indexes: [
      {
        unique: true,
        fields: ['code', 'faculty'],
      },
    ],
  }
);

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
