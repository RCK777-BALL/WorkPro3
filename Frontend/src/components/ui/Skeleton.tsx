import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonProps) {
  return <div className={clsx('animate-pulse rounded-lg bg-black/10 dark:bg-white/10', className)} aria-hidden />;
}

export function SkeletonLines() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-4 w-1/2" />
      <SkeletonBlock className="h-4 w-4/5" />
    </div>
  );
}
