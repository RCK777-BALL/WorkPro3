/*
 * SPDX-License-Identifier: MIT
 */

import express from "express";
import type { Request, Response, RequestHandler, Router } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "./middleware/mongoSanitize";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { initKafka, sendKafkaEvent } from "./utils/kafka";
import { initMQTTFromConfig } from "./iot/mqttClient";
import logger from "./utils/logger";

import * as routes from "./routes";

import { startPMScheduler } from "./utils/PMScheduler";
import { setupSwagger } from "./utils/swagger";
import mongoose from "mongoose";
import errorHandler from "./middleware/errorHandler";
import { validateEnv, type EnvVars } from "./config/validateEnv";
import { initChatSocket } from "./socket/chatSocket";
import User from "./models/User";
import type {
  WorkOrderUpdatePayload,
  InventoryUpdatePayload,
  NotificationPayload,
} from "./types/Payloads";
import { TenantRoutes } from "./routes";

dotenv.config();

let env: EnvVars;
try {
  env = validateEnv();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(env.PORT, 10);
const MONGO_URI = env.MONGO_URI;

const RATE_LIMIT_WINDOW_MS = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
const RATE_LIMIT_MAX = parseInt(env.RATE_LIMIT_MAX, 10);

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) =>
  origin.trim(),
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
app.use(cookieParser());
setupSwagger(app);

const dev = env.NODE_ENV !== "production";

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: dev ? 600 : RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => dev || req.ip === "::1" || req.ip === "127.0.0.1",
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

io.on("connection", (socket) => {
  logger.info("connected", socket.id);
  socket.on("ping", () => socket.emit("pong"));
});

app.get("/", (_req: Request, res: Response) => {
  res.send("PLTCMMS backend is running");
});

if (env.NODE_ENV === "test") {
  app.post("/test/sanitize", (req, res) => {
    res.json(req.body);
  });
  app.get("/test/sanitize", (req, res) => {
    res.json(req.query);
  });
}

// --- Routes (order matters for the limiter) ---
 app.use("/api/auth", routes.authRoutes);
app.use("/api/notifications", burstFriendly, routes.notificationsRoutes);
// Apply limiter to the rest of /api
app.use("/api", generalLimiter);

app.use("/api/departments", routes.departmentRoutes);
app.use("/api/workorders", routes.workOrdersRoutes);
app.use("/api/assets", routes.assetsRoutes);
app.use("/api/meters", routes.meterRoutes);
app.use("/api/condition-rules", routes.conditionRuleRoutes);
app.use("/api/tenants", TenantRoutes);
app.use("/api/pm-tasks", routes.pmTasksRoutes);
app.use("/api/reports", routes.reportsRoutes);
app.use("/api/lines", routes.LineRoutes);
app.use("/api/stations", routes.StationRoutes);
app.use("/api/inventory", routes.inventoryRoutes);
app.use("/api/v1/analytics", routes.analyticsRoutes);
app.use("/api/team", routes.teamRoutes);
app.use("/api/theme", routes.ThemeRoutes);
app.use("/api/request-portal", routes.requestPortalRoutes);

// Vendor portal routes
app.use("/api/vendor-portal", routes.vendorPortalRoutes);

app.use("/api/chat", routes.chatRoutes);
app.use("/api/webhooks", routes.webhooksRoutes);
app.use("/api/calendar", routes.calendarRoutes);
app.use("/api/integrations", routes.IntegrationRoutes);

app.use("/api/summary", routes.summaryRoutes);
 

// 404 + error handler
app.use((_req, res) => {
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
