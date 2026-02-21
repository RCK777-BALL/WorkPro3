import React from 'react';
import clsx from 'clsx';

interface FormFieldProps {
  label: string;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({ label, helpText, error, children, className }: FormFieldProps) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-[var(--wp-color-text)]">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red-600" role="alert">{error}</span>
      ) : helpText ? (
        <span className="text-xs text-[var(--wp-color-text-muted)]">{helpText}</span>
      ) : null}
    </label>
  );
}
