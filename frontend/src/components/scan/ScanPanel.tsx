/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import Badge from '@/components/common/Badge';
import QrScanner, { type QrScannerStatus } from '@/components/qr/QrScanner';

interface ScanPanelProps {
  title: string;
  description?: string;
  onDetected: (value: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

const statusCopy: Record<QrScannerStatus, string> = {
  idle: 'Idle',
  requesting: 'Requesting camera',
  scanning: 'Scanning',
  denied: 'Camera blocked',
  unsupported: 'Unsupported',
  error: 'Error',
  complete: 'Detected',
};

const ScanPanel: React.FC<ScanPanelProps> = ({ title, description, onDetected, onError, className }) => {
  const [status, setStatus] = React.useState<QrScannerStatus>('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  const handleError = (errorMessage: string) => {
    setMessage(errorMessage);
    onError?.(errorMessage);
  };

  return (
    <section className={className ?? 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
          {description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
          )}
        </div>
        <Badge text={statusCopy[status]} type={status === 'error' || status === 'denied' ? 'error' : 'info'} />
      </div>
      <QrScanner
        onDetected={onDetected}
        onError={handleError}
        onStatusChange={(next) => setStatus(next)}
      />
      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{message}</span>
        </div>
      )}
    </section>
  );
};

export default ScanPanel;
