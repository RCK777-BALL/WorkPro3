/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';
import type { Alert } from '@/store/alertStore';

export type IoTSignalPoint = {
  timestamp: string;
  value: number;
};

export type IoTSignalSeries = {
  assetId: string;
  assetName?: string;
  metric: string;
  latestValue: number | null;
  change: number;
  updatedAt?: string;
  points: IoTSignalPoint[];
};

export type IoTSignalQuery = {
  assetId?: string;
  metric?: string;
  limit?: number;
};

export type IoTReadingPayload = {
  assetId: string;
  metric: string;
  value: number;
  timestamp?: string;
};

export const fetchIotSignals = async (
  params?: IoTSignalQuery,
): Promise<IoTSignalSeries[]> => {
  const res = await http.get<IoTSignalSeries[]>('/iot/signals', { params });
  return res.data;
};

export const fetchIotAlerts = async (limit = 50): Promise<Alert[]> => {
  const res = await http.get<Alert[]>('/alerts', { params: { type: 'iot', limit } });
  return res.data;
};

export const ingestIotTelemetry = async (
  payload: IoTReadingPayload | IoTReadingPayload[],
) => {
  const res = await http.post('/iot/ingest', payload);
  return res.data;
};
