import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  /** Optional icon displayed next to the title */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerActions,
  icon,
  children,
  className = '',
  ...rest
}) => {
  return (
    <div {...rest} className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm p-6 ${className}`}>
      {(title || subtitle || headerActions || icon) && (
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start">
            {icon && <span className="mr-2 mt-0.5">{icon}</span>}
            <div>
              {title && <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
            </div>
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
