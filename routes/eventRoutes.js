const express = require('express');
const router = express.Router();

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');

const {
  registerForEvent,
  getEventAttendees
} = require('../controllers/registrationController');

const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const {
  createEventValidator,
  updateEventValidator,
  eventIdParamValidator,
  listEventsQueryValidator
} = require('../validators/eventValidator');
const {
  registrationEventParamValidator
} = require('../validators/registrationValidator');

// @route   GET /api/events (List all events with ?search= and pagination)
// @route   POST /api/events (Organizer only)
router
  .route('/')
  .get(listEventsQueryValidator, validate, getEvents)
  .post(protect, authorizeRoles('organizer'), createEventValidator, validate, createEvent);

// @route   GET /api/events/:id (Event details + remaining seats)
// @route   PUT /api/events/:id (Organizer only, owner of the event)
// @route   DELETE /api/events/:id (Organizer only, owner of the event)
router
  .route('/:id')
  .get(eventIdParamValidator, validate, getEventById)
  .put(protect, authorizeRoles('organizer'), updateEventValidator, validate, updateEvent)
  .delete(protect, authorizeRoles('organizer'), eventIdParamValidator, validate, deleteEvent);

// @route   POST /api/events/:id/register (Register logged-in user for event)
router.post(
  '/:id/register',
  protect,
  registrationEventParamValidator,
  validate,
  registerForEvent
);

// @route   GET /api/events/:id/registrations (Organizer only: attendee list)
router.get(
  '/:id/registrations',
  protect,
  authorizeRoles('organizer'),
  registrationEventParamValidator,
  validate,
  getEventAttendees
);

module.exports = router;
