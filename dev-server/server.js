import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import logger from './logger.js';

// Load environment variables
dotenv.config();

const app = express();

// This lightweight server is intended for local development only.
// Its CORS configuration mirrors the main backend so the frontend behaves the same.
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigin.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Start server
const PORT = process.env.PORT || 5010;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }

  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    server.on('error', (err) => {
      logger.error('Server failed to start:', err);
    });
  } catch (err) {
    logger.error('Server startup error:', err);
    process.exit(1);
  }
};

void startServer();
