import { jest } from '@jest/globals';

jest.setTimeout(120_000);

process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-secret';
process.env.NODE_ENV = 'test';
