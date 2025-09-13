/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import Button from '@common/Button';

export interface AuditLog {
  id: string;
  message: string;
  createdAt: string;
}

interface Props {
  logs: AuditLog[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

const RecentActivity: React.FC<Props> = ({ logs, loading, error, onRefresh }) => (
  <Card title="Recent Activity" headerActions={<Button size="sm" onClick={onRefresh}>Refresh</Button>}>
    {loading ? (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
        ))}
      </div>
    ) : error ? (
      <div className="text-sm text-error-700 bg-error-50 p-2 rounded">{error}</div>
    ) : logs.length === 0 ? (
      <div className="text-sm text-neutral-500">No recent activity.</div>
    ) : (
      <ul className="space-y-2 text-sm">
        {logs.map((log) => (
          <li key={log.id} className="flex justify-between">
            <span className="truncate">{log.message}</span>
            <span className="text-neutral-500 ml-2 whitespace-nowrap">
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export default RecentActivity;
