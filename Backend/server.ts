import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initKafka, sendKafkaEvent } from './utils/kafka';
import { initMQTTFromConfig } from './iot/mqttClient';

import authRoutes from './routes/authRoutes';
import workOrdersRoutes from './routes/WorkOrderRoutes';
import assetsRoutes from './routes/AssetRoutes';
import pmTasksRoutes from './routes/PMTaskRoutes';
import summaryRoutes from './routes/summary';

import reportsRoutes from './routes/ReportsRoutes';
import LineRoutes from './routes/LineRoutes';
import StationRoutes from './routes/StationRoutes';
import departmentRoutes from './routes/DepartmentRoutes';
import inventoryRoutes from './routes/InventoryRoutes';
import analyticsRoutes from './routes/AnalyticsRoutes';

import teamRoutes from './routes/TeamRoutes';
import notificationsRoutes from './routes/notifications';
import TenantRoutes from './routes/TenantRoutes';
import webhooksRoutes from './routes/webhooks';
import webhookRoutes from './routes/WebhookRoutes';
import ThemeRoutes from './routes/ThemeRoutes';
import chatRoutes from './routes/ChatRoutes';
import requestPortalRoutes from './routes/requestPortal';
import vendorPortalRoutes from './routes/vendorPortal';

// Keep BOTH of these:
import calendarRoutes from './routes/CalendarRoutes';
import conditionRuleRoutes from './routes/ConditionRuleRoutes';

import { startPMScheduler } from './utils/pmScheduler';
import { setupSwagger } from './utils/swagger';
import mongoose from 'mongoose';
import errorHandler from './middleware/errorHandler';
import { validateEnv } from './config/validateEnv';
import { initChatSocket } from './socket/chatSocket';
import type {
  WorkOrderUpdatePayload,
  InventoryUpdatePayload,
  NotificationPayload,
} from './types/Payloads';

dotenv.config();

try {
  validateEnv();
} catch (err) {
  console.error(err);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5010;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/platinum_cmms';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
setupSwagger(app);

const dev = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: dev ? 600 : RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => dev || req.ip === '::1' || req.ip === '127.0.0.1',
});

const burstFriendly = rateLimit({
  windowMs: 60_000,
  max: dev ? 1000 : 240,
  standardHeaders: true,
  legacyHeaders: false,
});

export const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

initChatSocket(io);

io.on('connection', (socket) => {
  console.log('connected', socket.id);
  socket.on('ping', () => socket.emit('pong'));
});

app.get('/', (_req: Request, res: Response) => {
  res.send('PLTCMMS backend is running');
});

// --- Routes (order matters for the limiter) ---
app.use('/api/auth', authRoutes);
app.use('/api/notifications', burstFriendly, notificationsRoutes);
// Apply limiter to the rest of /api
app.use('/api', generalLimiter);

app.use('/api/departments', departmentRoutes);
app.use('/api/workorders', workOrdersRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/condition-rules', conditionRuleRoutes);
app.use('/api/tenants', TenantRoutes);
app.use('/api/pm-tasks', pmTasksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/lines', LineRoutes);
app.use('/api/stations', StationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/theme', ThemeRoutes);
app.use('/api/request-portal', requestPortalRoutes);

// Support both paths for the vendor portal
app.use('/api/vendor-portal', vendorPortalRoutes);
app.use('/api/vendor', vendorPortalRoutes);

app.use('/api/chat', chatRoutes);
app.use('/api/hooks', webhookRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/calendar', calendarRoutes);

app.use('/api/summary', summaryRoutes);

// 404 + error handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(errorHandler);

// --- Mongo + server start ---
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      httpServer.listen(PORT, () =>
        console.log(`Server listening on http://localhost:${PORT}`),
      );
      initKafka(io).catch((err) => console.error('Kafka init error:', err));
      initMQTTFromConfig();
      startPMScheduler('default', {
        cronExpr: process.env.PM_SCHEDULER_CRON,
        taskModulePath: process.env.PM_SCHEDULER_TASK,
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
}

// --- Emit helpers ---
export const emitWorkOrderUpdate = (workOrder: WorkOrderUpdatePayload) => {
  void sendKafkaEvent('workOrderUpdates', workOrder);
};

export const emitInventoryUpdate = (item: InventoryUpdatePayload) => {
  void sendKafkaEvent('inventoryUpdates', item);
};

export const emitNotification = (notification: NotificationPayload) => {
  io.emit('notification', notification);
};

export default app;
