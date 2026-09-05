const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const env = require('./config/env');

const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Enable inline assets for the dashboard SPA
    crossOriginEmbedderPolicy: false,
  })
);

// Enable CORS
app.use(cors());

// Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging in non-test environments
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve Frontend Static Web Portal
app.use(express.static(path.join(__dirname, '../public')));

// Mount Central API Routes
app.use('/api', apiRoutes);

// Unmatched API route handler
app.use('/api/*', notFoundHandler);

// Fallback to SPA index.html for non-API web portal navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
