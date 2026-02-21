import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}

export default function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--wp-color-text)]">{value}</p>
          {hint ? <p className="mt-1 text-sm text-[var(--wp-color-text-muted)]">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="rounded-xl bg-[var(--wp-color-primary)]/10 p-2 text-[var(--wp-color-primary)]" aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
