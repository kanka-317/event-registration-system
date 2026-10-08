const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Register a new user or organizer
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'An account with this email address already exists.');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    const token = user.generateAuthToken();

    return successResponse(
      res,
      201,
      'User registered successfully.',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        token
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password.');
    }

    const token = user.generateAuthToken();

    return successResponse(
      res,
      200,
      'Login successful.',
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    return successResponse(
      res,
      200,
      'User profile fetched successfully.',
      {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
