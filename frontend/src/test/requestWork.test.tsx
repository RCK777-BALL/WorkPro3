/*
 * SPDX-License-Identifier: MIT
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import RequestWork from '../pages/RequestWork';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllTimers();
});
afterAll(() => server.close());

test('submits request and polls for status', async () => {
  vi.useFakeTimers();
  server.use(
    rest.post('/api/public/request-work', (_req, res, ctx) => res(ctx.json({ code: 'ABC123' }))),
    rest.get('/api/public/request-work/ABC123', (_req, res, ctx) => res(ctx.json({ status: 'done' }))),
  );

  render(<RequestWork />);

  await userEvent.type(screen.getByLabelText(/Description/i), 'Need help');
  await userEvent.type(screen.getByLabelText(/Contact/i), 'me@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(await screen.findByTestId('code')).toHaveTextContent('ABC123');

  vi.advanceTimersByTime(1000);

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('done'));
});

test('shows error on failed submit', async () => {
  server.use(rest.post('/api/public/request-work', (_req, res, ctx) => res(ctx.status(500))));

  render(<RequestWork />);

  await userEvent.type(screen.getByLabelText(/Description/i), 'Need help');
  await userEvent.type(screen.getByLabelText(/Contact/i), 'me@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

