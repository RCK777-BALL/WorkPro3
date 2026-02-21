import React from 'react';
import clsx from 'clsx';

interface ModalFrameProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function ModalFrame({ title, children, footer, className }: ModalFrameProps) {
  return (
    <div className={clsx('rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]', className)}>
      <header className="border-b border-[var(--wp-color-border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">{title}</h2>
      </header>
      <div className="px-5 py-4">{children}</div>
      {footer ? <footer className="border-t border-[var(--wp-color-border)] px-5 py-4">{footer}</footer> : null}
    </div>
  );
}
