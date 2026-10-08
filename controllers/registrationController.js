const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Register for an event
 * @route   POST /api/events/:id/register
 * @access  Private (Logged-in user)
 */
const registerForEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // 1. Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 404, 'Event not found.');
    }

    // 2. Business Rule: Block registration if event date has passed
    const now = new Date();
    const eventDate = new Date(event.date);
    if (eventDate < now) {
      return errorResponse(
        res,
        400,
        'Cannot register for an event that has already passed.'
      );
    }

    // 3. Business Rule: Prevent duplicate active registration
    const existingRegistration = await Registration.findOne({
      user: userId,
      event: eventId
    });

    if (existingRegistration && existingRegistration.status === 'registered') {
      return errorResponse(
        res,
        400,
        'You are already registered for this event.'
      );
    }

    // 4. Business Rule: Block registration if event is full
    const activeRegistrationsCount = await Registration.countDocuments({
      event: eventId,
      status: 'registered'
    });

    if (activeRegistrationsCount >= event.capacity) {
      return errorResponse(
        res,
        400,
        'This event is fully booked. No remaining seats are available.'
      );
    }

    let registration;

    // If user previously cancelled, reactivate registration to preserve unique compound index
    if (existingRegistration && existingRegistration.status === 'cancelled') {
      existingRegistration.status = 'registered';
      existingRegistration.registeredAt = new Date();
      await existingRegistration.save();
      registration = existingRegistration;
    } else {
      // Create new registration
      registration = await Registration.create({
        user: userId,
        event: eventId,
        status: 'registered',
        registeredAt: new Date()
      });
    }

    // Populate registration details for response
    const populatedRegistration = await Registration.findById(registration._id)
      .populate('user', 'name email')
      .populate({
        path: 'event',
        select: 'title description date time location capacity createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      });

    const remainingSeats = Math.max(0, event.capacity - (activeRegistrationsCount + 1));

    return successResponse(
      res,
      201,
      'Registration successful!',
      {
        registration: populatedRegistration,
        remainingSeats
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registrations of the logged-in user
 * @route   GET /api/registrations/my
 * @access  Private (Logged-in user)
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const registrations = await Registration.find({ user: userId })
      .populate({
        path: 'event',
        select: 'title description date time location capacity createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      200,
      'User registrations fetched successfully.',
      {
        total: registrations.length,
        registrations
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel user's own registration
 * @route   PATCH /api/registrations/:id/cancel
 * @access  Private (Logged-in user)
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user._id;

    const registration = await Registration.findById(registrationId);

    if (!registration) {
      return errorResponse(res, 404, 'Registration not found.');
    }

    // Business Rule: Users can only view/cancel their own registrations
    if (registration.user.toString() !== userId.toString()) {
      return errorResponse(
        res,
        403,
        'Forbidden: You can only cancel your own registrations.'
      );
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      return errorResponse(
        res,
        400,
        'This registration has already been cancelled.'
      );
    }

    // Update status to cancelled
    registration.status = 'cancelled';
    await registration.save();

    // Fetch event to calculate new remaining seats
    const event = await Event.findById(registration.event);
    let remainingSeats = null;
    if (event) {
      const activeCount = await Registration.countDocuments({
        event: event._id,
        status: 'registered'
      });
      remainingSeats = Math.max(0, event.capacity - activeCount);
    }

    const populatedRegistration = await Registration.findById(registration._id)
      .populate('user', 'name email')
      .populate('event', 'title date time location capacity');

    return successResponse(
      res,
      200,
      'Registration cancelled successfully. Seat is now freed up.',
      {
        registration: populatedRegistration,
        remainingSeats
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendee list for an event
 * @route   GET /api/events/:id/registrations
 * @access  Private (Organizer only, owner of the event)
 */
const getEventAttendees = async (req, res, next) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(res, 404, 'Event not found.');
    }

    // Business Rule: Only the event creator (or organizer) can view attendee lists
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(
        res,
        403,
        'Forbidden: You can only view attendees for events created by your organizer account.'
      );
    }

    // Fetch attendees
    const attendees = await Registration.find({ event: eventId })
      .populate('user', 'name email role')
      .sort({ registeredAt: -1 });

    const activeCount = attendees.filter((a) => a.status === 'registered').length;
    const cancelledCount = attendees.filter((a) => a.status === 'cancelled').length;
    const remainingSeats = Math.max(0, event.capacity - activeCount);

    return successResponse(
      res,
      200,
      'Attendee list retrieved successfully.',
      {
        event: {
          id: event._id,
          title: event.title,
          capacity: event.capacity,
          activeCount,
          cancelledCount,
          remainingSeats
        },
        attendees
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  getEventAttendees
};
