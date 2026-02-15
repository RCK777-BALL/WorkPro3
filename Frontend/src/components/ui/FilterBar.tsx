import React from 'react';
import clsx from 'clsx';
import Card from './Card';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export default function FilterBar({ children, className }: FilterBarProps) {
  return (
    <Card className={clsx('p-4', className)}>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{children}</div>
    </Card>
  );
}
