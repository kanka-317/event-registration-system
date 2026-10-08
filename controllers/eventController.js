const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get all events with search, pagination, and remaining seats
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    // Search query matching title, description, or location
    const matchFilter = {};
    if (search) {
      matchFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Aggregation pipeline to join active registrations and calculate remaining seats
    const pipeline = [
      { $match: matchFilter },
      // Lookup active registrations count
      {
        $lookup: {
          from: 'registrations',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$event', '$$eventId'] },
                    { $eq: ['$status', 'registered'] }
                  ]
                }
              }
            }
          ],
          as: 'activeRegistrations'
        }
      },
      // Lookup organizer information
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      {
        $unwind: {
          path: '$organizer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          registeredCount: { $size: '$activeRegistrations' },
          remainingSeats: {
            $max: [
              0,
              {
                $subtract: ['$capacity', { $size: '$activeRegistrations' }]
              }
            ]
          },
          'createdBy': {
            _id: '$organizer._id',
            name: '$organizer.name',
            email: '$organizer.email'
          }
        }
      },
      {
        $project: {
          activeRegistrations: 0,
          organizer: 0,
          __v: 0
        }
      },
      { $sort: { date: 1, createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const result = await Event.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const events = result[0]?.data || [];
    const totalPages = Math.ceil(total / limit) || 1;

    return successResponse(res, 200, 'Events retrieved successfully.', {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event details with remaining seats
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .lean();

    if (!event) {
      return errorResponse(res, 404, 'Event not found.');
    }

    // Count active registrations
    const registeredCount = await Registration.countDocuments({
      event: event._id,
      status: 'registered'
    });

    const remainingSeats = Math.max(0, event.capacity - registeredCount);
    const isFull = remainingSeats === 0;

    const eventDetails = {
      ...event,
      registeredCount,
      remainingSeats,
      isFull
    };

    return successResponse(res, 200, 'Event details retrieved successfully.', eventDetails);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private (Organizer only)
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, location, capacity } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      time,
      location,
      capacity,
      createdBy: req.user._id
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .lean();

    return successResponse(res, 201, 'Event created successfully.', {
      ...populatedEvent,
      registeredCount: 0,
      remainingSeats: populatedEvent.capacity,
      isFull: false
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an event
 * @route   PUT /api/events/:id
 * @access  Private (Organizer only, owner of the event)
 */
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return errorResponse(res, 404, 'Event not found.');
    }

    // Check ownership
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(
        res,
        403,
        'Forbidden: You are not authorized to update this event because you are not its creator.'
      );
    }

    const { capacity } = req.body;

    // Check capacity reduction against current active registrations
    if (capacity !== undefined) {
      const activeRegistrations = await Registration.countDocuments({
        event: event._id,
        status: 'registered'
      });

      if (capacity < activeRegistrations) {
        return errorResponse(
          res,
          400,
          `Cannot reduce event capacity to ${capacity}. There are already ${activeRegistrations} active attendees registered.`
        );
      }
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'date', 'time', 'location', 'capacity'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    const activeRegistrations = await Registration.countDocuments({
      event: event._id,
      status: 'registered'
    });

    const updatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .lean();

    return successResponse(res, 200, 'Event updated successfully.', {
      ...updatedEvent,
      registeredCount: activeRegistrations,
      remainingSeats: Math.max(0, updatedEvent.capacity - activeRegistrations),
      isFull: updatedEvent.capacity <= activeRegistrations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private (Organizer only, owner of the event)
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return errorResponse(res, 404, 'Event not found.');
    }

    // Check ownership
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(
        res,
        403,
        'Forbidden: You are not authorized to delete this event because you are not its creator.'
      );
    }

    // Remove associated registrations
    await Registration.deleteMany({ event: event._id });

    // Delete event
    await Event.findByIdAndDelete(event._id);

    return successResponse(res, 200, 'Event and all associated registrations deleted successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
