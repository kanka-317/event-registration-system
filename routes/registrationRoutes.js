const express = require('express');
const router = express.Router();

const {
  getMyRegistrations,
  cancelRegistration
} = require('../controllers/registrationController');

const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const {
  registrationIdParamValidator
} = require('../validators/registrationValidator');

// @route   GET /api/registrations/my (View logged-in user's registrations)
router.get('/my', protect, getMyRegistrations);

// @route   PATCH /api/registrations/:id/cancel (Cancel own registration)
router.patch(
  '/:id/cancel',
  protect,
  registrationIdParamValidator,
  validate,
  cancelRegistration
);

module.exports = router;
