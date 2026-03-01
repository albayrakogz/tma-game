import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase, seed } from './database';
import userRoutes from './routes/user';
import gameRoutes from './routes/game';
import socialRoutes from './routes/social';
import taskRoutes from './routes/tasks';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global rate limiter: 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api', userRoutes);
app.use('/api', gameRoutes);
app.use('/api', socialRoutes);
app.use('/api', taskRoutes);
app.use('/api', adminRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
try {
  initializeDatabase();
  seed();
  console.log('Database initialized and seeded');
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`TapRealm server running on port ${PORT}`);
});

export default app;
