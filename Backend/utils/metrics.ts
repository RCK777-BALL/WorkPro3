/*
 * SPDX-License-Identifier: MIT
 */

import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
  buckets: [25, 50, 100, 200, 400, 800, 1500, 3000, 5000, 10000],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const socketConnections = new client.Gauge({
  name: 'socket_connections',
  help: 'Active Socket.IO connections',
  registers: [registry],
});

export const getMetricsRegistry = () => registry;

export default { getMetricsRegistry, httpRequestDurationMs, httpRequestsTotal, socketConnections };
