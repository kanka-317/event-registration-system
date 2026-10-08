const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    date: {
      type: Date,
      required: [true, 'Please provide an event date']
    },
    time: {
      type: String,
      required: [true, 'Please provide an event start time (e.g. 10:00 AM or 18:30)'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Please provide an event location/venue or online URL'],
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters']
    },
    capacity: {
      type: Number,
      required: [true, 'Please provide the total attendee capacity'],
      min: [1, 'Capacity must be at least 1']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster search and filtering
eventSchema.index({ title: 'text', description: 'text', location: 'text' });
eventSchema.index({ date: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Event', eventSchema);
