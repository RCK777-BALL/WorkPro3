/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

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

export const createMeterReading = async (input: CreateMeterReadingInput): Promise<MeterReading> => {
  const res = await http.post<MeterReading>('/meters/readings', input);
  return res.data;
};
