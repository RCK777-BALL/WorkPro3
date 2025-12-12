/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { cn } from '@/utils/cn';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'outline'
  | 'ghost'
  | 'destructive';

type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  as?: React.ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
};

type ButtonProps<C extends React.ElementType = 'button'> = ButtonOwnProps &
  Omit<React.ComponentPropsWithoutRef<C>, keyof ButtonOwnProps | 'color' | 'disabled'> & {
    disabled?: boolean;
  };

const baseClasses =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400',
  secondary:
    'bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-200 focus-visible:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
  success:
    'bg-success-600 text-white shadow-sm hover:bg-success-700 focus-visible:ring-success-500 dark:bg-success-600 dark:hover:bg-success-500',
  danger:
    'bg-error-600 text-white shadow-sm hover:bg-error-700 focus-visible:ring-error-500 dark:bg-error-600 dark:hover:bg-error-500',
  destructive:
    'bg-error-600 text-white shadow-sm hover:bg-error-700 focus-visible:ring-error-500 dark:bg-error-600 dark:hover:bg-error-500',
  warning:
    'bg-warning-500 text-white shadow-sm hover:bg-warning-600 focus-visible:ring-warning-400 dark:bg-warning-500 dark:hover:bg-warning-400',
  outline:
    'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-100 dark:hover:bg-neutral-800/60',
  ghost:
    'bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-800/60',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = React.forwardRef(
  <C extends React.ElementType = 'button'>(
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      as,
      type,
      ...rest
    }: ButtonProps<C>,
    ref: React.Ref<React.ElementRef<C>>,
  ) => {
    const Component = (as ?? 'button') as React.ElementType;
    const isButton = Component === 'button';
    const isDisabled = Boolean(disabled || loading);

    return (
      <Component
        ref={ref}
        type={isButton ? (type ?? 'button') : undefined}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...(isButton ? { disabled: isDisabled } : {})}
        {...rest}
      >
        {loading && (
          <span role="status" className="mr-2 inline-flex items-center">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </span>
        )}

        {icon && iconPosition === 'left' && !loading ? (
          <span className="mr-2 flex items-center">{icon}</span>
        ) : null}

        {children}

        {icon && iconPosition === 'right' ? (
          <span className="ml-2 flex items-center">{icon}</span>
        ) : null}
      </Component>
    );
  },
);

Button.displayName = 'Button';

export default Button;
