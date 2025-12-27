/*
 * SPDX-License-Identifier: MIT
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { useTheme } from '@/context/ThemeContext';

const radioButtonVariants = cva(
  'h-4 w-4 rounded-full border border-neutral-300 focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 text-primary-600',
  {
    variants: {
      color: {
        brand: 'text-primary-600 focus:ring-primary-600',
        brandInverted: 'text-white bg-primary-600 focus:ring-white',
      },
    },
    defaultVariants: {
      color: 'brand',
    },
  }
);

export interface RadioButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'color'>,
    VariantProps<typeof radioButtonVariants> {}

const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ className, color, onChange, value, checked, ...rest }, ref) => {
    const { theme, setTheme } = useTheme();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      const val = e.target.value;
      if (val === 'light' || val === 'dark' || val === 'system') {
        setTheme(val);
      }
    };

    return (
      <input
        type="radio"
        ref={ref}
        value={value}
        className={cn(radioButtonVariants({ color }), className)}
        checked={checked ?? theme === value}
        onChange={handleChange}
        {...rest}
      />
    );
  }
);

RadioButton.displayName = 'RadioButton';

export { RadioButton, radioButtonVariants };
export default RadioButton;

 
