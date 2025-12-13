/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export type Meter = {
  id: string;
  asset: string;
  name: string;
  unit: string;
  currentValue?: number;
  pmInterval?: number;
  lastWOValue?: number;
};

export type MeterReading = {
  id: string;
  assetId: string;
  value: number;
  createdAt: string;
};

export type CreateMeterReadingInput = {
  assetId: string;
  value: number;
};

export const fetchMeters = async (assetId?: string): Promise<Meter[]> => {
  const res = await http.get<Meter[]>('/meters', { params: assetId ? { asset: assetId } : undefined });
  return res.data;
};

export const createMeterReading = async (input: CreateMeterReadingInput): Promise<MeterReading> => {
  const res = await http.post<MeterReading>('/meters/readings', input);
  return res.data;
};

export const addMeterReading = async (meterId: string, value: number): Promise<MeterReading> => {
  const res = await http.post<MeterReading>(`/meters/${meterId}/readings`, { value });
  return res.data;
};
