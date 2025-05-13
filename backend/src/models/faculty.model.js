const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Numele facultății este obligatoriu'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Codul facultății este obligatoriu'],
      trim: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'Universitatea este obligatorie'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Create a compound index to ensure unique faculty codes within a university
    indexes: [
      {
        unique: true,
        fields: ['code', 'university'],
      },
    ],
  }
);

const Faculty = mongoose.model('Faculty', facultySchema);

module.exports = Faculty;
