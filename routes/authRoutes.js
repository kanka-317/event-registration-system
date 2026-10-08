const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { registerValidator, loginValidator } = require('../validators/authValidator');

// @route   POST /api/auth/register
router.post('/register', registerValidator, validate, register);

// @route   POST /api/auth/login
router.post('/login', loginValidator, validate, login);

// @route   GET /api/auth/me (Bonus: Current logged-in user profile)
router.get('/me', protect, getMe);

module.exports = router;
