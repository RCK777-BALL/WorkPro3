 import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

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
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof radioButtonVariants> {}

const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ className, color, ...props }, ref) => {
    return (
      <input
        type="radio"
        ref={ref}
        className={cn(radioButtonVariants({ color }), className)}
        {...props}
      />
    );
  }
);

RadioButton.displayName = 'RadioButton';

export { RadioButton, radioButtonVariants };
export default RadioButton;

 
