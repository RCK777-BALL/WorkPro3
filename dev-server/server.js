"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
const db_1 = require("../backend/config/db");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// This lightweight server is intended for local development only.
// Its CORS configuration mirrors the main backend so the frontend behaves the same.
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
const corsOptions = {
    origin: (origin, cb) => {
        if (!origin || allowedOrigin.includes(origin))
            return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
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
        await (0, db_1.connectDB)();
        logger_1.default.info('MongoDB connected');
    }
    catch (err) {
        logger_1.default.error('MongoDB connection error:', err);
        process.exit(1);
    }
    try {
        const server = app.listen(PORT, () => {
            logger_1.default.info(`Server running on port ${PORT}`);
        });
        server.on('error', (err) => {
            logger_1.default.error('Server failed to start:', err);
        });
    }
    catch (err) {
        logger_1.default.error('Server startup error:', err);
        process.exit(1);
    }
};
void startServer();
