/*
 * SPDX-License-Identifier: MIT
 */

export interface IntegrationHook {
  _id: string;
  name: string;
  type: string;
  url: string;
  events: string[];
}

export interface ApiKey {
  _id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  rateLimitMax?: number;
}

export interface WebhookSubscription {
  _id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  maxAttempts: number;
  createdAt: string;
}

export interface ExportJob {
  _id: string;
  type: string;
  format: string;
  status: string;
  createdAt: string;
  fileName?: string;
}
