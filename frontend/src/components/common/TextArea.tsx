/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { cn } from '@/utils/cn';

type TextAreaProps = {
  label?: string;
  description?: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseClasses =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500';

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, description, error, className, required, id, ...props }, ref) => {
    const textareaId = id ?? React.useId();

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-neutral-700">
            {label}
            {required ? <span className="ml-0.5 text-error-600">*</span> : null}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(baseClasses, error && 'border-error-500 focus:border-error-500 focus:ring-error-500', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={description ? `${textareaId}-description` : undefined}
          required={required}
          {...props}
        />
        {description && (
          <p id={`${textareaId}-description`} className="text-xs text-neutral-500">
            {description}
          </p>
        )}
        {error && <p className="text-xs text-error-600">{error}</p>}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';

export default TextArea;
