/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@common/Card';
import Button from '@common/Button';

interface Props {
  label: string;
  value?: number | string;
  suffix?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const KpiTile: React.FC<Props> = ({
  label,
  value,
  suffix,
  loading = false,
  error,
  onRetry,
}) => (
  <Card className="space-y-1">
    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</h3>
    {loading ? (
      <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
    ) : error ? (
      <div className="text-sm text-error-700 bg-error-50 p-2 rounded flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    ) : (
      <p className="text-2xl font-semibold">{value}{suffix}</p>
    )}
  </Card>
);

export default KpiTile;
