import React from 'react';
import clsx from 'clsx';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <div className={clsx('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--wp-color-text)] md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--wp-color-text-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
