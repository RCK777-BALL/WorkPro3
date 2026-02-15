/*
 * SPDX-License-Identifier: MIT
 */

type PromClientLike = {
  Registry: new () => any;
  Histogram: new (config: Record<string, unknown>) => any;
  Counter: new (config: Record<string, unknown>) => any;
  Gauge: new (config: Record<string, unknown>) => any;
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
const registry = client ? new client.Registry() : { metrics: async () => '' };

if (client) {
  client.collectDefaultMetrics({ register: registry });
}

const noopMetric = {
  labels: () => ({ observe: (_value: number) => undefined, inc: (_value?: number) => undefined }),
  inc: (_value?: number) => undefined,
  set: (_value: number) => undefined,
};

export const httpRequestDurationMs = client
  ? new client.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [registry],
      buckets: [25, 50, 100, 200, 400, 800, 1500, 3000, 5000, 10000],
    })
  : noopMetric;

export const httpRequestsTotal = client
  ? new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [registry],
    })
  : noopMetric;

export const socketConnections = client
  ? new client.Gauge({
      name: 'socket_connections',
      help: 'Active Socket.IO connections',
      registers: [registry],
    })
  : noopMetric;

export const getMetricsRegistry = () => registry;

export default { getMetricsRegistry, httpRequestDurationMs, httpRequestsTotal, socketConnections };
