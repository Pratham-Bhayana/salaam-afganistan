const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/admin');
const embassyRoutes = require('./routes/embassy');
const websiteRoutes = require('./routes/website');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PER_MIN || 300),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'salaam-afghanistan-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Salaam Afghanistan API v1',
    modules: {
      public: '/api/v1/*',
      admin: '/api/v1/admin/* (JWT — admin staff)',
      embassy: '/api/v1/embassy/* (JWT — embassy staff)',
      website: '/api/v1/website/* (Firebase login → JWT — applicants)',
    },
  });
});

app.use('/api/v1', publicRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/embassy', embassyRoutes);
app.use('/api/v1/website', websiteRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
