/*
 * SPDX-License-Identifier: MIT
 */

import express from "express";
import type { Request, Response, RequestHandler } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "./middleware/mongoSanitize";
import dotenv from "dotenv";
import { createServer } from "http";
import helmet from "helmet";
import client from "prom-client";
import rateLimit from "express-rate-limit";
import path from "path";

import { initKafka, sendKafkaEvent } from "./utils/kafka";
import { initMQTTFromConfig } from "./iot/mqttClient";
import logger from "./utils/logger";
import requestId from "./middleware/requestId";
import requestLog from "./middleware/requestLog";
import tenantResolver from "./middleware/tenantResolver";
import auditLogMiddleware from "./middleware/auditLogMiddleware";
import customReportsRouter from "./src/modules/custom-reports";

import {
  adminRoutes,
  analyticsRoutes,
  analyticsDashboardRoutes,
  analyticsAIRoutes,
  copilotRoutes,
  alertRoutes,
  assetsRoutes,
  attachmentRoutes,
  auditRoutes,
  authRoutes,
  calendarRoutes,
  chatRoutes,
  partsRoutes,
  complianceRoutes,
  conditionRuleRoutes,
  notificationAdminRoutes,
  dashboardRoutes,
  departmentRoutes,
  importRoutes,
  integrationsRoutes,
  inventoryRoutes,
  iotRoutes,
  kbRoutes,
  laborRoutes,
  LineRoutes,
  pmRoutes,
  maintenanceScheduleRoutes,
  meterRoutes,
  notificationsRoutes,
  inventoryV2Routes,
  plantRoutes,
  contractorRoutes,
  commentRoutes,
  calibrationRoutes,
  permitRoutes,
  pmTasksRoutes,
  publicRequestRoutes,
  settingsRoutes,
  reportsRoutes,
  requestPortalRoutes,
  requestsRoutes,
  globalRoutes,
  roleRoutes,
  ssoRoutes,
  statusRoutes,
  StationRoutes,
  summaryRoutes,
  teamRoutes,
  technicianRoutes,
  TenantRoutes,
  ThemeRoutes,
  downtimeLogRoutes,
  vendorPortalRoutes,
  vendorRoutes,
  webhooksRoutes,
  workOrdersRoutes,
  mobileSyncRoutes,
  inspectionRoutes,

} from "./routes";
import mobileRoutes from "./routes/mobileRoutes";
import mobileSyncAdminRoutes from "./routes/mobileSyncAdmin";
import featureFlagRoutes from "./routes/FeatureFlagRoutes";
import uiRoutes from "./routes/uiRoutes";
import healthRouter from "./src/routes/health";
import systemSummaryRouter from "./src/routes/summary";
import hierarchyRouter from "./src/modules/hierarchy";
import importExportRouter from "./src/modules/importExport";
import inventoryModuleRouter from "./src/modules/inventory";
import inventoryFoundationsRouter from "./src/modules/inventory-foundations";
import purchaseOrdersModuleRouter from "./src/modules/purchase-orders";
import integrationsModuleRouter from "./src/modules/integrations";
import exportsModuleRouter from "./src/modules/exports";
import webhooksModuleRouter from "./src/modules/webhooks";
import workRequestsRouter from "./src/modules/work-requests";
import { notificationsModuleRouter } from "./src/modules/notifications";
import pmTemplatesRouter from "./src/modules/pm";
import templatesRouter from "./src/modules/templates";
import onboardingRouter from "./src/modules/onboarding";
import assetInsightsRouter from "./src/modules/assets";
import executiveRouter from "./src/modules/executive";
import analyticsModuleRouter from "./src/modules/analytics";
import downtimeRouter from "./src/modules/downtime";
import meterReadingsRouter from "./src/modules/meters";
import workOrdersModuleRouter from "./src/modules/work-orders";
import scanHistoryRouter from "./src/modules/scan-history";
import inventoryBinsRouter from "./src/modules/inventory-bins";
import purchaseRequestsRouter from "./src/modules/purchase-requests";
import workflowsRouter from "./src/modules/workflows";
import sitesRouter from "./src/modules/sites";
import purchaseOrdersApiRouter from "./src/routes/purchaseOrders";
import { startWorkOrderReminderJobs } from "./src/modules/work-orders/jobs";
import { startWorkRequestReminderJobs } from "./src/modules/work-requests/jobs";
import { startExportWorker } from "./workers/exportWorker";

import { startPMScheduler } from "./utils/PMScheduler";
import { startCopilotSummaryJob } from "./tasks/copilotSummaries";
import { startExecutiveReportScheduler } from "./tasks/executiveReports";
import { startAnalyticsWarehouseScheduler } from "./tasks/analyticsWarehouse";
import { startLowStockScanner } from "./src/jobs/lowStockScan";
import { startReorderAlertScanner } from "./src/jobs/reorderAlertScan";
import { setupSwagger } from "./utils/swagger";
import mongoose from "mongoose";
import errorHandler from "./middleware/errorHandler";
import { validateEnv, type EnvVars } from "./config/validateEnv";
import { initChatSocket } from "./socket/chatSocket";
import { initSocket } from "./socket";
import User from "./models/User";
import { requireAuth } from "./middleware/authMiddleware";
import tenantScope from "./middleware/tenantScope";
import { apiAccessMiddleware } from "./middleware/apiAccess";
import type {
  WorkOrderUpdatePayload,
  InventoryUpdatePayload,
  NotificationPayload,
} from "./types/Payloads";
import scimRoutes from "./routes/scimRoutes";

dotenv.config();

let env: EnvVars;
try {
  env = validateEnv();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);
const httpServer = createServer(app);
const PORT = parseInt(env.PORT, 10);
const MONGO_URI = env.MONGO_URI;

const RATE_LIMIT_WINDOW_MS = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
const RATE_LIMIT_MAX = parseInt(env.RATE_LIMIT_MAX, 10);

const normalizeOrigin = (origin: string | undefined) => origin?.trim().replace(/\/+$/, "").toLowerCase();

const allowedOrigins = new Set<string>(
  env.CORS_ORIGIN
    .split(",")
    .map((origin: string) => normalizeOrigin(origin))
    .filter((origin: string | undefined): origin is string => Boolean(origin)),
);

const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://0.0.0.0:5173"];
devOrigins.forEach((origin) => allowedOrigins.add(normalizeOrigin(origin) as string));

type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const checkCorsOrigin = (origin: string | undefined, callback: CorsOriginCallback) => {
  const normalized = normalizeOrigin(origin);

  if (!origin || (normalized && allowedOrigins.has(normalized))) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const corsOptions: CorsOptions = {
  origin: checkCorsOrigin,
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

const corsMiddleware = cors(corsOptions) as unknown as RequestHandler;

app.use(cookieParser());
app.use(requestId);
app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false }));
app.use(requestLog);
app.use(tenantResolver);
app.use(auditLogMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
setupSwagger(app, "/api/docs/ui", apiAccessMiddleware);
app.get("/api-docs", (_req: Request, res: Response) => {
  res.redirect(301, "/api/docs/ui");
});

const dev = env.NODE_ENV !== "production";

const mobileRateLimitWindow = parseInt(env.MOBILE_RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const mobileRateLimitMax = parseInt(env.MOBILE_RATE_LIMIT_MAX ?? "120", 10);

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: dev ? 600 : RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) =>
    dev || req.ip === "::1" || req.ip === "127.0.0.1" || req.path.startsWith("/api/mobile"),
});

const mobileLimiter = rateLimit({
  windowMs: mobileRateLimitWindow,
  max: dev ? 400 : mobileRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

const burstFriendly = rateLimit({
  windowMs: 60_000,
  max: dev ? 1000 : 240,
  standardHeaders: true,
  legacyHeaders: false,
});

client.collectDefaultMetrics();

export const io = initSocket(httpServer, Array.from(allowedOrigins));

app.set('io', io);

initChatSocket(io);

io.on("connection", (socket) => {
  logger.info("socket connected", {
    id: socket.id,
    origin: socket.handshake.headers.origin,
  });
  socket.on("ping", () => socket.emit("pong"));
  socket.on("disconnect", (reason) => {
    logger.info("socket disconnected", { id: socket.id, reason });
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.send("PLTCMMS backend is running");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, port: PORT, timestamp: new Date().toISOString() });
});

app.get("/ready", (_req: Request, res: Response) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected, database: connected ? "connected" : "disconnected" });
});

app.get("/metrics", async (_req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
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
app.use("/api/health", healthRouter);
app.use("/api/hierarchy", hierarchyRouter);
app.use("/api", workRequestsRouter);
app.use("/api/import-export", importExportRouter);
app.use("/api/inventory/v2", inventoryV2Routes);
app.use("/api/inventory/v2", inventoryModuleRouter);
app.use("/api/inventory/v3", inventoryFoundationsRouter);
app.use("/api/integrations/v2", integrationsModuleRouter);
app.use("/api/webhooks/v2", webhooksModuleRouter);
app.use("/api/exports/v2", exportsModuleRouter);
app.use("/api/sso", ssoRoutes);
app.use("/api/scim/v2", scimRoutes);

// --- Routes (order matters for the limiter) ---
app.use("/api/auth", authRoutes);
app.use("/api/scim", scimRoutes);

// Protect all remaining /api routes except /api/auth, /api/public, /api/sso, and /api/scim
app.use(/^\/api(?!\/(auth|public|sso|scim|docs))/, requireAuth, tenantScope);

app.use("/api/mobile", mobileLimiter, mobileRoutes);
app.use("/api/mobile", mobileLimiter, mobileSyncAdminRoutes);
app.use("/api/mobile", mobileLimiter, mobileSyncRoutes);

app.use("/api/notifications", notificationsModuleRouter);
app.use("/api/notifications/admin", burstFriendly, notificationAdminRoutes);
app.use("/api/notifications", burstFriendly, notificationsRoutes);
// Apply limiter to the rest of protected /api routes
app.use(/^\/api(?!\/(auth|public))/, generalLimiter);

app.use("/api/po", purchaseOrdersModuleRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/inventory/bins", inventoryBinsRouter);
app.use("/api/purchase-requests", purchaseRequestsRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/purchase-orders", purchaseOrdersApiRouter);
app.use("/api/pm/templates", pmTemplatesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/executive", executiveRouter);
app.use("/api/analytics/v2", analyticsModuleRouter);
app.use("/api/downtime", downtimeRouter);
app.use("/api/downtime-events", downtimeRouter);
app.use("/api/custom-reports", customReportsRouter);
app.use("/api/work-orders", workOrdersModuleRouter);

app.use("/api/departments", departmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/workorders", workOrdersRoutes);
app.use("/api/permits", permitRoutes);
app.use("/api/calibration", calibrationRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/condition-rules", conditionRuleRoutes);
app.use("/api/downtime-logs", downtimeLogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/assets", assetInsightsRouter);
app.use("/api/roles", roleRoutes);
app.use("/api/feature-flags", featureFlagRoutes);
app.use("/api/meters", meterReadingsRouter);
app.use("/api/meters", meterRoutes);
app.use("/api/tenants", TenantRoutes);
app.use("/api/pm-tasks", pmTasksRoutes);
app.use("/api/pm", pmRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/lines", LineRoutes);
app.use("/api/stations", StationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/parts", partsRoutes);
app.use("/api/import", importRoutes);
app.use("/api/maintenance-schedules", maintenanceScheduleRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/labor", laborRoutes);
app.use("/api/knowledge-base", kbRoutes);
app.use("/api/plants", plantRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/api/analytics/dashboard", analyticsDashboardRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/ai", analyticsAIRoutes);
app.use("/api/ai", copilotRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/theme", ThemeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/technician", technicianRoutes);
app.use("/api/request-portal", requestPortalRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/work-requests", requestsRoutes);

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
app.use("/api/scan-history", scanHistoryRouter);
app.use("/api/audit", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/system/summary", systemSummaryRouter);


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
      httpServer.listen(PORT, () =>
        logger.info(`Server listening on http://localhost:${PORT}`),
      );
      void User.syncIndexes()
        .then(() => logger.info("User indexes synchronized"))
        .catch((indexErr) => logger.error("User index sync error", indexErr));
      initKafka(io).catch((err) => logger.error("Kafka init error:", err));
      initMQTTFromConfig();
      startPMScheduler("default", {
        cronExpr: env.PM_SCHEDULER_CRON,
        taskModulePath: env.PM_SCHEDULER_TASK,
      });
      startCopilotSummaryJob();
      startExecutiveReportScheduler(env.EXECUTIVE_REPORT_CRON);
      startAnalyticsWarehouseScheduler();
      startLowStockScanner(env.REORDER_SUGGESTION_CRON);
      startReorderAlertScanner(env.REORDER_ALERT_CRON);
      startWorkOrderReminderJobs();
      startWorkRequestReminderJobs();
      startExportWorker();
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
