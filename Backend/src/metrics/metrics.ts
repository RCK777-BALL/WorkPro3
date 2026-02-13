/*
 * SPDX-License-Identifier: MIT
 */

import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const jobRunDuration = new client.Histogram({
  name: 'job_run_duration_ms',
  help: 'Duration of background jobs in ms',
  labelNames: ['job', 'status'],
  registers: [metricsRegistry],
});

export const recordHttpDuration = (method: string, route: string, status: string, durationMs: number) => {
  httpRequestDuration.labels(method, route, status).observe(durationMs);
};

export const recordJobDuration = (job: string, status: string, durationMs: number) => {
  jobRunDuration.labels(job, status).observe(durationMs);
};
