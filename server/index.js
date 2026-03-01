const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global rate limiter: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));
app.use('/api/boosts', require('./routes/boosts'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/squads', require('./routes/squads'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Miner Kingdom server running on port ${PORT}`);
});

module.exports = app;
