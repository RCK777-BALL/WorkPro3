/*
 * SPDX-License-Identifier: MIT
 */

import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';

const logLevel = process.env.LOG_LEVEL || 'info';
const destinations = (process.env.LOG_DESTINATIONS || 'console,file')
  .split(',')
  .map((d) => d.trim());

const logDir = process.env.LOG_DIR || 'logs';
if (destinations.includes('file') && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const transports: winston.transport[] = [];

if (destinations.includes('console')) {
  transports.push(
    new winston.transports.Console({
      level: logLevel,
    })
  );
}

if (destinations.includes('file')) {
  transports.push(
    new DailyRotateFile({
      level: logLevel,
      dirname: logDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '14d',
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});

export const mqttLogger = logger.child({ module: 'mqtt' });

export default logger;
