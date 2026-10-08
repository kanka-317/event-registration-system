const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

const path = require('path');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Development logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Interactive API Documentation Dashboard
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// Health Check / API Root
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event Registration System API is running smoothly.',
    documentation: '/docs',
    healthCheck: '/api/health',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy.',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Server] Base URL: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Server Error] Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
