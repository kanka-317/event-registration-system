const { body, param, query } = require('express-validator');

const createEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Event description is required')
    .isLength({ max: 3000 })
    .withMessage('Description cannot exceed 3000 characters'),

  body('date')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Event date must be a valid ISO8601 date (YYYY-MM-DD)')
    .custom((value) => {
      const eventDate = new Date(value);
      const today = new Date();
      // Set to start of today in local comparison
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        throw new Error('Event date cannot be in the past');
      }
      return true;
    }),

  body('time')
    .trim()
    .notEmpty()
    .withMessage('Event time is required (e.g., 10:00 AM or 18:30)'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Event location is required')
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),

  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1 })
    .withMessage('Capacity must be an integer of at least 1')
    .toInt()
];

const updateEventValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Event ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Event title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Event description cannot be empty')
    .isLength({ max: 3000 })
    .withMessage('Description cannot exceed 3000 characters'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Event date must be a valid ISO8601 date (YYYY-MM-DD)')
    .custom((value) => {
      const eventDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        throw new Error('Event date cannot be in the past');
      }
      return true;
    }),

  body('time')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Event time cannot be empty'),

  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Event location cannot be empty')
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),

  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be an integer of at least 1')
    .toInt()
];

const eventIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Event ID format')
];

const listEventsQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
];

module.exports = {
  createEventValidator,
  updateEventValidator,
  eventIdParamValidator,
  listEventsQueryValidator
};
