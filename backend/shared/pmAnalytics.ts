/*
 * SPDX-License-Identifier: MIT
 */

export interface PmCompletionPoint {
  period: string;
  onTime: number;
  late: number;
  missed: number;
  total: number;
  completionRate: number;
}

export interface PmCompletionSummary {
  onTime: number;
  late: number;
  missed: number;
  total: number;
  completionRate: number;
}

export interface PmCompletionResponse {
  trend: PmCompletionPoint[];
  totals: PmCompletionSummary;
}
