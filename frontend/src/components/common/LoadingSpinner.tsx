/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

interface LoadingSpinnerProps {
  fullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<Required<LoadingSpinnerProps>['size'], string> = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-3',
  lg: 'h-12 w-12 border-4',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullscreen = false, size = 'lg' }) => {
  const spinner = (
    <div
      className={`animate-spin rounded-full ${sizeMap[size]} border-primary-600 border-t-transparent`}
      aria-label="Loading"
    />
  );

  if (fullscreen) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-50">{spinner}</div>;
  }

  return <div className="flex items-center justify-center">{spinner}</div>;
};

export default LoadingSpinner;
