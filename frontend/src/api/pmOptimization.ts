/*
 * SPDX-License-Identifier: MIT
 */

import http from '@/lib/http';

export interface PmOptimizationAssetInsight {
  assetId: string;
  assetName?: string;
  usage: {
    runHoursPerDay: number;
    cyclesPerDay: number;
  };
  failureProbability: number;
  compliance: {
    total: number;
    completed: number;
    overdue: number;
    percentage: number;
    impactScore: number;
  };
}

export interface PmOptimizationScenario {
  label: string;
  description: string;
  intervalDelta: number;
  failureProbability: number;
  compliancePercentage: number;
}

export interface PmOptimizationResponse {
  updatedAt: string;
  assets: PmOptimizationAssetInsight[];
  scenarios: PmOptimizationScenario[];
}

export const fetchPmWhatIfSimulations = async (): Promise<PmOptimizationResponse> => {
  const res = await http.get<PmOptimizationResponse>('/analytics/pm-optimization/what-if');
  return res.data;
};
