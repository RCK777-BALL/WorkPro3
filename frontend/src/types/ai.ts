/*
 * SPDX-License-Identifier: MIT
 */

export interface FailureSignal {
  label: string;
  detail: string;
  impact: number;
}

export interface RecommendedPart {
  name: string;
  quantity?: number;
  partId?: string;
  reason?: string;
}

export interface PmTemplateDraft {
  title: string;
  intervalDays: number;
  checklist: string[];
  parts: RecommendedPart[];
  tools: string[];
}

export interface FailurePredictionInsight {
  workOrderId?: string;
  assetId?: string;
  failureProbability: number;
  confidence: number;
  horizonDays: number;
  rootCauseSummary: string;
  signals: FailureSignal[];
  recommendedActions: string[];
  recommendedParts: RecommendedPart[];
  recommendedTools: string[];
  pmTemplateDraft?: PmTemplateDraft;
  generatedAt: string;
  nextBestActions?: string[];
}

