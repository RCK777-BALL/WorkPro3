/*
 * SPDX-License-Identifier: MIT
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

export const telemetryEmitter = new EventEmitter();

export const emitTelemetry = (event: string, payload: Record<string, unknown>): void => {
  const enriched = { ...payload, event, timestamp: new Date().toISOString() };
  telemetryEmitter.emit(event, enriched);
  logger.info('telemetry event', { telemetry: enriched });
};
