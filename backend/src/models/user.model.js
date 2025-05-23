const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: [true, 'Google ID este obligatoriu'],
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'Prenumele este obligatoriu'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Numele este obligatoriu'],
      trim: true,
    },    email: {
      type: String,
      required: [true, 'Email-ul este obligatoriu'],
      unique: true,
      trim: true,
      lowercase: true,
      // TESTING: Modified email validation to allow both domains
      // For production, replace with the commented regex below
      match: [/.+\@(ulbsibiu\.ro|gmail\.com)$/, 'Doar email-urile cu domeniul @ulbsibiu.ro sau @gmail.com sunt acceptate'],
      // Original validation for production:
      // match: [/.+\@ulbsibiu\.ro$/, 'Doar email-urile cu domeniul @ulbsibiu.ro sunt acceptate'],
    },
    profilePicture: {
      type: String,
    },    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },position: {
      type: String,
      enum: ['Prof', 'Conf', 'Lect', 'Asist', 'Drd', 'titular', 'asociat'],
      required: [true, 'Poziția este obligatorie'],
      default: 'titular' // Default value to use during Google OAuth registration
    },
    faculty: {
      type: String,
      required: false,
      trim: true,
    },
    department: {
      type: String,
      required: false,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
