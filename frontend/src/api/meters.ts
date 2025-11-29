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
};

export type MeterReading = {
  id: string;
  meter: string;
  value: number;
  timestamp: string;
};

export const fetchMeters = async (assetId?: string): Promise<Meter[]> => {
  const res = await http.get<Meter[]>('/meters', assetId ? { params: { asset: assetId } } : undefined);
  return res.data;
};

export const addMeterReading = async (meterId: string, value: number): Promise<MeterReading> => {
  const res = await http.post<MeterReading>(`/meters/${meterId}/readings`, { value });
  return res.data;
};
