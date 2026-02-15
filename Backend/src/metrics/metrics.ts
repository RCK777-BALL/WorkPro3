/*
 * SPDX-License-Identifier: MIT
 */

type PromClientLike = {
  Registry: new () => any;
  Histogram: new (config: Record<string, unknown>) => any;
  collectDefaultMetrics: (config: Record<string, unknown>) => void;
};

const loadPromClient = (): PromClientLike | null => {
  try {
    return require('prom-client') as PromClientLike;
  } catch {
    return null;
  }
};

const client = loadPromClient();

const noopMetric = {
  labels: () => ({ observe: (_value: number) => undefined }),
};

const fallbackRegistry = { metrics: async () => '' };

export const metricsRegistry = client ? new client.Registry() : fallbackRegistry;

if (client) {
  client.collectDefaultMetrics({ register: metricsRegistry });
}

export const httpRequestDuration = client
  ? new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'status'],
      registers: [metricsRegistry],
    })
  : noopMetric;

export const jobRunDuration = client
  ? new client.Histogram({
      name: 'job_run_duration_ms',
      help: 'Duration of background jobs in ms',
      labelNames: ['job', 'status'],
      registers: [metricsRegistry],
    })
  : noopMetric;

export const recordHttpDuration = (method: string, route: string, status: string, durationMs: number) => {
  httpRequestDuration.labels(method, route, status).observe(durationMs);
};

export const recordJobDuration = (job: string, status: string, durationMs: number) => {
  jobRunDuration.labels(job, status).observe(durationMs);
};
