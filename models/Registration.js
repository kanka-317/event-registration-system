const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Registration must belong to a user']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Registration must belong to an event']
    },
    status: {
      type: String,
      enum: {
        values: ['registered', 'cancelled'],
        message: 'Status must be either registered or cancelled'
      },
      default: 'registered'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate registrations for the same user and event
registrationSchema.index({ user: 1, event: 1 }, { unique: true });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
