import React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900';
  
  const variantClasses = {
    primary: 'bg-primary-950 text-white hover:bg-primary-800 focus:ring-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600',
    secondary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 dark:bg-success-700 dark:hover:bg-success-600',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 dark:bg-error-700 dark:hover:bg-error-600',
    destructive: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 dark:bg-error-700 dark:hover:bg-error-600',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-400 dark:bg-warning-600 dark:hover:bg-warning-500',
    outline: 'bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500 dark:text-neutral-200 dark:hover:bg-neutral-800',
  };
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };
  
  const widthClass = fullWidth && 'w-full';
  const disabledClass = disabled && 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClass,
        disabledClass,
        className,
      )}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading && (
        <span role="status" className="-ml-1 mr-2 inline-flex">
          <svg
            className="animate-spin h-4 w-4 text-current"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="sr-only">Loading...</span>
        </span>
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

export default Button;
