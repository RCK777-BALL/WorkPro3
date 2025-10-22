/*
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white shadow-sm transition hover:bg-primary-500 focus-visible:ring-2 focus-visible:ring-primary-400',
        destructive:
          'bg-error-600 text-white shadow-sm hover:bg-error-500 focus-visible:ring-2 focus-visible:ring-error-400',
        outline:
          'border border-neutral-300 bg-background hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
        secondary:
          'bg-secondary-800 text-white shadow-sm hover:bg-secondary-700 focus-visible:ring-2 focus-visible:ring-secondary-500',
        ghost: 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        link: 'underline-offset-4 hover:underline text-primary-600',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;

