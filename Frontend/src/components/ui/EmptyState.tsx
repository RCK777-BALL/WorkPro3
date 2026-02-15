import React from 'react';
import { PlusCircle } from 'lucide-react';
import Card from './Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-4">
        <span className="rounded-full bg-[var(--wp-color-primary)]/10 p-3 text-[var(--wp-color-primary)]" aria-hidden>
          <PlusCircle className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">{title}</h3>
        <p className="text-sm text-[var(--wp-color-text-muted)]">{description}</p>
        {action}
      </div>
    </Card>
  );
}
