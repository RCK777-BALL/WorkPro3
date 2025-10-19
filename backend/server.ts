/*
 * SPDX-License-Identifier: MIT
 */

import express from "express";
import type { Request, Response } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "./middleware/mongoSanitize";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

import { initKafka, sendKafkaEvent } from "./utils/kafka";
import { initMQTTFromConfig } from "./iot/mqttClient";
import logger from "./utils/logger";
import requestLog from "./middleware/requestLog";

import {
  adminRoutes,
  analyticsRoutes,
  assetsRoutes,
  attachmentRoutes,
  auditRoutes,
  authRoutes,
  calendarRoutes,
  chatRoutes,
  complianceRoutes,
  conditionRuleRoutes,
  dashboardRoutes,
  departmentRoutes,
  importRoutes,
  integrationsRoutes,
  inventoryRoutes,
  kbRoutes,
  laborRoutes,
  LineRoutes,
  meterRoutes,
  notificationsRoutes,
  permitRoutes,
  pmRoutes,
  pmTasksRoutes,
  publicRequestRoutes,
  reportsRoutes,
  requestPortalRoutes,
  statusRoutes,
  StationRoutes,
  summaryRoutes,
  teamRoutes,
  TenantRoutes,
  ThemeRoutes,
  vendorPortalRoutes,
  vendorRoutes,
  webhooksRoutes,
  workOrdersRoutes,
} from "./routes";
import uiRoutes from "./routes/uiRoutes";

import { startPMScheduler } from "./utils/PMScheduler";
import { setupSwagger } from "./utils/swagger";
import mongoose from "mongoose";
import errorHandler from "./middleware/errorHandler";
import { validateEnv, type EnvVars } from "./config/validateEnv";
import { initChatSocket } from "./socket/chatSocket";
import User from "./models/User";
import { requireAuth } from "./middleware/authMiddleware";
import tenantScope from "./middleware/tenantScope";
import type {
  WorkOrderUpdatePayload,
  InventoryUpdatePayload,
  Notificaimport cors from "cors";
tionPayload,
} from "./types/Payloads";

dotenv.config();

let env: EnvVars;
try {
  env = validateEnv();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

const app = express();
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
  allowedHeaders: ["Content-Type","Authorization","x-tenant-id"],
}));

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
  }),
);

app.set("trust proxy", 1);
const httpServer = createServer(app);
const PORT = parseInt(env.PORT, 10);
const MONGO_URI = env.MONGO_URI;

const RATE_LIMIT_WINDOW_MS = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
const RATE_LIMIT_MAX = parseInt(env.RATE_LIMIT_MAX, 10);

const allowedOrigins = new Set(
  env.CORS_ORIGIN
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
);
allowedOrigins.add("http://localhost:5173");

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "authorization",
    "x-tenant-id",
    "X-Tenant-Id",
    "x-site-id",
    "X-Site-Id",
  ],
  exposedHeaders: ["x-tenant-id"],
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(helmet());
app.use(requestLog);
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
setupSwagger(app);

const dev = env.NODE_ENV !== "production";

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: dev ? 600 : RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => dev || req.ip === "::1" || req.ip === "127.0.0.1",
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

app.set('io', io);

initChatSocket(io);

io.on("connection", (socket) => {
  logger.info("connected", socket.id);
  socket.on("ping", () => socket.emit("pong"));
});

app.get("/", (_req: Request, res: Response) => {
  res.send("PLTCMMS backend is running");
});

app.use("/static/uploads", express.static(path.join(process.cwd(), "uploads")));

if (env.NODE_ENV === "test") {
  app.post("/test/sanitize", (req: Request, res: Response) => {
    res.json(req.body);
  });
  app.get("/test/sanitize", (req: Request, res: Response) => {
    res.json(req.query);
  });
}

app.use("/api/public", publicRequestRoutes);
app.use("/api", uiRoutes);

// --- Routes (order matters for the limiter) ---
app.use("/api/auth", authRoutes);

// Protect all remaining /api routes except /api/auth and /api/public
app.use(/^\/api(?!\/(auth|public))/, requireAuth, tenantScope);

app.use("/api/notifications", burstFriendly, notificationsRoutes);
// Apply limiter to the rest of protected /api routes
app.use(/^\/api(?!\/(auth|public))/, generalLimiter);

app.use("/api/departments", departmentRoutes);
app.use("/api/workorders", workOrdersRoutes);
app.use("/api/permits", permitRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/meters", meterRoutes);
app.use("/api/condition-rules", conditionRuleRoutes);
app.use("/api/tenants", TenantRoutes);
app.use("/api/pm-tasks", pmTasksRoutes);
app.use("/api/pm", pmRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/lines", LineRoutes);
app.use("/api/stations", StationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/import", importRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/labor", laborRoutes);
app.use("/api/knowledge-base", kbRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/theme", ThemeRoutes);
app.use("/api/request-portal", requestPortalRoutes);

// Vendor portal routes
app.use("/api/vendor-portal", vendorPortalRoutes);

app.use("/api/chat", chatRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/integrations", integrationsRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/attachments", attachmentRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);


// 404 + error handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

app.use(errorHandler);

// --- Mongo + server start ---
if (env.NODE_ENV !== "test") {
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      logger.info("MongoDB connected");
      try {
        await User.syncIndexes();
        logger.info("User indexes synchronized");
      } catch (indexErr) {
        logger.error("User index sync error", indexErr);
      }
      httpServer.listen(PORT, () =>
        logger.info(`Server listening on http://localhost:${PORT}`),
      );
      initKafka(io).catch((err) => logger.error("Kafka init error:", err));
      initMQTTFromConfig();
      startPMScheduler("default", {
        cronExpr: env.PM_SCHEDULER_CRON,
        taskModulePath: env.PM_SCHEDULER_TASK,
      });
    })
    .catch((err) => {
      logger.error("MongoDB connection error:", err);
    });
}

// --- Emit helpers ---
export const emitWorkOrderUpdate = (workOrder: WorkOrderUpdatePayload) => {
  void sendKafkaEvent("workOrderUpdates", workOrder);
};

export const emitInventoryUpdate = (item: InventoryUpdatePayload) => {
  void sendKafkaEvent("inventoryUpdates", item);
};

export const emitNotification = (notification: NotificationPayload) => {
  io.emit("notification", notification);
};

export default app;
