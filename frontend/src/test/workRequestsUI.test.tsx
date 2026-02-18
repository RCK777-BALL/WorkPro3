/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PublicRequestPage from '@/public/request/PublicRequestPage';
import WorkRequestDashboard from '@/pages/WorkRequestDashboard';
import {
  convertWorkRequest,
  fetchWorkRequestSummary,
  fetchWorkRequests,
  type WorkRequestItem,
} from '@/api/workRequests';

const toastMocks = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: toastMocks.mockToastSuccess, error: toastMocks.mockToastError },
  success: toastMocks.mockToastSuccess,
  error: toastMocks.mockToastError,
  toast: { success: toastMocks.mockToastSuccess, error: toastMocks.mockToastError },
}));

vi.mock('@/api/workRequests', () => ({
  fetchWorkRequestSummary: vi.fn(),
  fetchWorkRequests: vi.fn(),
  convertWorkRequest: vi.fn(),
}));

const mockedFetchSummary = vi.mocked(fetchWorkRequestSummary);
const mockedFetchRequests = vi.mocked(fetchWorkRequests);
const mockedConvert = vi.mocked(convertWorkRequest);

const sampleRequest: WorkRequestItem = {
  _id: 'req-1',
  token: 'tok-1',
  title: 'Broken conveyor',
  description: 'Line 2 stopped suddenly',
  requesterName: 'Jordan',
  requesterEmail: 'jordan@example.com',
  priority: 'medium',
  status: 'new',
  createdAt: new Date().toISOString(),
  photos: [],
};

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const renderPublicPage = () =>
  render(
    <MemoryRouter future={routerFuture} initialEntries={[{ pathname: '/request/default' }]}> 
      <Routes>
        <Route path="/request/:slug" element={<PublicRequestPage />} />
      </Routes>
    </MemoryRouter>,
  );

const renderDashboard = () => render(<WorkRequestDashboard />);

describe('PublicRequestPage validation', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('blocks submission until required fields are present and handles success', async () => {
    renderPublicPage();

    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/title/i), 'Loose guard rail');
    await userEvent.type(screen.getByLabelText(/description/i), 'The guard rail is loose near the stairs.');
    await userEvent.type(screen.getByLabelText(/your name/i), 'Sam');

    expect(submit).toBeEnabled();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { requestId: '123', token: 'tok-123', status: 'new' } }),
    });

    await userEvent.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/public/work-requests',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      );
    });

    expect(await screen.findByText(/save this token/i)).toBeInTheDocument();
  });

  it('surfaces errors returned from submission', async () => {
    renderPublicPage();

    await userEvent.type(screen.getByLabelText(/title/i), 'Loose guard rail');
    await userEvent.type(screen.getByLabelText(/description/i), 'The guard rail is loose near the stairs.');
    await userEvent.type(screen.getByLabelText(/your name/i), 'Sam');

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid form' }) });

    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText(/invalid form/i)).toBeInTheDocument();
  });
});

describe('WorkRequestDashboard triage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchSummary.mockResolvedValue({
      total: 1,
      open: 1,
      statusCounts: { new: 1, reviewing: 0, converted: 0, closed: 0, rejected: 0, accepted: 0, deleted: 0 },
      recent: [sampleRequest],
    });
    mockedFetchRequests.mockResolvedValue({
      items: [sampleRequest],
      total: 1,
      page: 1,
      pageSize: 200,
      totalPages: 1,
    });
  });

  it('loads requests and allows conversion', async () => {
    mockedConvert.mockResolvedValue({ workOrderId: 'wo-1', request: { ...sampleRequest, status: 'converted' } });

    renderDashboard();

    expect(await screen.findByText(/work requests/i)).toBeInTheDocument();
    expect(await screen.findByText(sampleRequest.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /convert/i }));

    await waitFor(() => {
      expect(mockedConvert).toHaveBeenCalledWith(sampleRequest._id);
    });

    expect(toastMocks.mockToastSuccess).toHaveBeenCalled();
  });

  it('shows an error when conversion fails', async () => {
    mockedConvert.mockRejectedValueOnce(new Error('not allowed'));

    renderDashboard();
    await screen.findByText(sampleRequest.title);

    await userEvent.click(screen.getByRole('button', { name: /convert/i }));

    await waitFor(() => {
      expect(toastMocks.mockToastError).toHaveBeenCalled();
    });
  });
});
