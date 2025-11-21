/*
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';
import { useRealtimeStatusStore } from './store';

const formatFreshness = (timestamp?: number) => {
  if (!timestamp) return 'waiting for first event';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
};

const StreamingIndicator = ({ freshness }: { freshness: string }) => (
  <div
    className="flex items-center gap-2 text-xs text-success-700 dark:text-success-200"
    data-testid="streaming-indicator"
  >
    <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" aria-hidden />
    <span>Live stream connected • Freshness: {freshness}</span>
  </div>
);

export const RealtimeStatusBanner: React.FC = () => {
  const { mode, banner, retryInMs, lastDelivery } = useRealtimeStatusStore();

  const freshness = useMemo(() => formatFreshness(lastDelivery), [lastDelivery]);

  if (mode === 'streaming' && !banner) {
    return <StreamingIndicator freshness={freshness} />;
  }

  return (
    <div
      className="rounded-md bg-warning-50 p-3 text-xs text-warning-800 shadow-sm dark:bg-warning-900/40 dark:text-warning-200"
      role="status"
    >
      <div className="font-medium">Realtime degraded</div>
      <div>{banner ?? 'Falling back to polling until the stream recovers.'}</div>
      <div className="mt-1 text-[11px] text-warning-700 dark:text-warning-300">
        Freshness: {freshness}
        {retryInMs ? ` • Retrying in ${Math.round(retryInMs / 1000)}s` : ''}
      </div>
    </div>
  );
};

export default RealtimeStatusBanner;
