/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import passport from 'passport';
import jwt from 'jsonwebtoken';

vi.mock('../services/jitProvisioningService', () => ({
  provisionUserFromIdentity: vi.fn(async (input: { email: string; tenantId: string; siteId?: string; roles: string[] }) => ({
    user: {
      _id: input.email === 'user@example.com' ? 'user-1' : 'user-mock',
      email: input.email,
      tenantId: input.tenantId,
      siteId: input.siteId,
      roles: input.roles,
      tokenVersion: 0,
      active: true,
    },
    created: false,
  })),
}));

import authRoutes from '../routes/AuthRoutes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
});

beforeEach(() => {
  process.env.FRONTEND_URL = 'http://frontend.example/login';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OAuth callback', () => {
  it('redirects with token and email on success', async () => {
    const user = {
      email: 'user@example.com',
      tenantId: 'tenant-123',
      siteId: 'site-456',
      roles: ['tech'],
      id: 'user-1',
    } as Express.User;
    vi.spyOn(passport, 'authenticate').mockImplementation(
      (_provider, _options, callback) => {
        return (_req, _res, _next) => {
          (callback as (err: unknown, user?: Express.User | false | null) => void)(
            null,
            user,
          );
        };
      },
    );

    const res = await request(app)
      .get('/api/auth/oauth/google/callback')
      .expect(302);

    const redirect = res.headers['location'];
    expect(redirect).toBeTruthy();
    expect(redirect.startsWith('http://frontend.example/login?')).toBe(true);
    const url = new URL(redirect);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');
    const tenantId = url.searchParams.get('tenantId');
    const siteId = url.searchParams.get('siteId');
    const roles = url.searchParams.get('roles');
    const userId = url.searchParams.get('userId');
    expect(email).toBe('user@example.com');
    expect(tenantId).toBe('tenant-123');
    expect(siteId).toBe('site-456');
    expect(roles).toBe('tech');
    expect(userId).toBe('user-1');
    const payload = jwt.verify(token!, 'testsecret') as jwt.JwtPayload;
    expect(payload.email).toBe('user@example.com');
    expect(payload.tenantId).toBe('tenant-123');
    expect(payload.siteId).toBe('site-456');
    expect(payload.roles).toEqual(['tech']);
    expect(payload.id).toBe('user-1');
  });

  it('returns 400 when authentication fails', async () => {
    vi.spyOn(passport, 'authenticate').mockImplementation(
      (_provider, _options, callback) => {
        return (_req, _res, _next) => {
          (callback as (err: unknown, user?: Express.User | false | null) => void)(
            new Error('fail'),
            null,
          );
        };
      },
    );

    const res = await request(app)
      .get('/api/auth/oauth/google/callback')
      .expect(400);
    expect(res.body.message).toBe('Authentication failed');
  });

  it('returns 400 when no user is provided', async () => {
    vi.spyOn(passport, 'authenticate').mockImplementation(
      (_provider, _options, callback) => {
        return (_req, _res, _next) => {
          (callback as (err: unknown, user?: Express.User | false | null) => void)(
            null,
            false,
          );
        };
      },
    );

    const res = await request(app)
      .get('/api/auth/oauth/google/callback')
      .expect(400);
    expect(res.body.message).toBe('Authentication failed');
  });
});

