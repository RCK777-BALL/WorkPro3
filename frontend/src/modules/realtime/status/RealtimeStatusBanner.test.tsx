import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { RealtimeStatusBanner } from './RealtimeStatusBanner';
import { useRealtimeStatusStore } from './store';

describe('RealtimeStatusBanner', () => {
  afterEach(() => {
    act(() => {
      useRealtimeStatusStore.setState({
        mode: 'streaming',
        lastDelivery: undefined,
        retryInMs: null,
        banner: null,
      });
    });
  });

  it('shows a streaming indicator with freshness text', () => {
    render(<RealtimeStatusBanner />);
    act(() => {
      useRealtimeStatusStore.getState().markDelivery();
    });
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
    expect(screen.getByText(/Live stream connected/i)).toBeInTheDocument();
  });

  it('renders a polling banner with retry messaging', () => {
    render(<RealtimeStatusBanner />);
    act(() => {
      useRealtimeStatusStore.getState().setPolling('Socket offline; falling back to polling', 15000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/falling back to polling/i)).toBeInTheDocument();
    expect(screen.getByText(/Retrying in 15s/i)).toBeInTheDocument();
  });
});
