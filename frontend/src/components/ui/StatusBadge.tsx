/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import cn from '@/utils/cn';

const STATUS_STYLES: Record<string, string> = {
  'Ok': 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300',
  'Atención': 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-300',
  'Crítico': 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-300',
  'Plan': 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const defaultClasses = 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/20 dark:text-neutral-300';

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const colorClasses = STATUS_STYLES[status] ?? defaultClasses;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses,
        className,
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
