const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Numele universității este obligatoriu'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Codul universității este obligatoriu'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: [true, 'Adresa universității este obligatorie'],
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const University = mongoose.model('University', universitySchema);

module.exports = University;
