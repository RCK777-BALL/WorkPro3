import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from '../config/validateEnv';
import logger from '../utils/logger';

const ORIGINAL_ENV = process.env;

describe('validateEnv logging', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('logs an error when env variables are invalid', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    process.env = { ...process.env, JWT_SECRET: 'secret', PORT: 123 as any } as any;

    expect(() => validateEnv()).toThrow('Missing or invalid environment variables');
    expect(spy).toHaveBeenCalledWith('❌ Invalid environment variables:', expect.any(Object));
  });
});
