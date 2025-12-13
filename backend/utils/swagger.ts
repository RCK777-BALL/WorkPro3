/*
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { Express, type RequestHandler } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import logger from './logger';
import { safeStringify } from './safeStringify';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'WorkPro3 API',
    version: '1.0.0',
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, '../controllers/**/*.ts'),
    path.join(__dirname, '../routes/**/*.ts'),
    path.join(__dirname, '../src/**/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (
  app: Express,
  path = '/api/docs/ui',
  middleware: RequestHandler[] = [],
) => {
  const handlers = Array.isArray(middleware) ? middleware : [middleware];
  app.use(path, ...handlers, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get(`${path}.json`, ...handlers, (_req, res) => res.json(swaggerSpec));
};

if (require.main === module) {
  // When run directly, output the spec for validation
  logger.info(safeStringify(swaggerSpec));
}
