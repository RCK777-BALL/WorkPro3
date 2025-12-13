/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { cn } from '@/utils/cn';

type InputProps = {
  label?: string;
  description?: string;
  error?: string;
  helperText?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const baseClasses =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, helperText, className, required, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
            {label}
            {required ? <span className="ml-0.5 text-error-600">*</span> : null}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(baseClasses, error && 'border-error-500 focus:border-error-500 focus:ring-error-500', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={description ? `${inputId}-description` : undefined}
          required={required}
          {...props}
        />
        {description && (
          <p id={`${inputId}-description`} className="text-xs text-neutral-500">
            {description}
          </p>
        )}
        {error && <p className="text-xs text-error-600">{error}</p>}
        {helperText && !description && !error && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
