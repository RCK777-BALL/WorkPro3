/*
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'WorkPro3 API',
    version: '1.0.0',
  },
};

const options = {
  definition: swaggerDefinition,
  apis: [path.join(__dirname, '../controllers/**/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

if (require.main === module) {
  // When run directly, output the spec for validation
  console.log(JSON.stringify(swaggerSpec, null, 2));
}
