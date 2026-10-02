const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const customerRoutes = require('./routes/customer.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const transcriptionRoutes = require('./routes/transcription.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());
app.use(morgan('dev'));

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/transcribe', transcriptionRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
