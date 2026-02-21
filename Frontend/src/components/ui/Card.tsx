import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <section
      className={clsx(
        'rounded-[var(--wp-radius-xxl)] border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 shadow-[0_10px_24px_rgba(2,6,23,0.08)] md:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}
