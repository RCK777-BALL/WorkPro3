import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ok, fail, asyncHandler } from '../src/lib/http';
import errorHandler from '../middleware/errorHandler';

const app = express();
app.use(express.json());

app.get(
  '/hello',
  asyncHandler(async (_req, res) => {
    ok(res, { greeting: 'hi' });
  }),
);

app.get(
  '/boom',
  asyncHandler(async () => {
    throw new Error('boom');
  }),
);

app.post(
  '/echo',
  asyncHandler(async (req, res) => {
    ok(res, req.body, 201);
  }),
);

app.post(
  '/reject',
  asyncHandler(async (_req, res) => {
    fail(res, 'Bad request', 400);
  }),
);

app.use(errorHandler);

describe('http envelope helpers', () => {
  it('handles successful GET', async () => {
    const res = await request(app).get('/hello');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { greeting: 'hi' }, error: null });
  });

  it('handles error GET via errorHandler', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ data: null, error: 'boom' });
  });

  it('handles successful POST', async () => {
    const res = await request(app).post('/echo').send({ a: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { a: 1 }, error: null });
  });

  it('handles failed POST', async () => {
    const res = await request(app).post('/reject').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ data: null, error: 'Bad request' });
  });
});
