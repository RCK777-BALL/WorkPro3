/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string | undefined;
  subtitle?: string | undefined;
  headerActions?: React.ReactNode;
  /** Optional icon displayed next to the title */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string | undefined;
  noPadding?: boolean | undefined;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerActions,
  icon,
  children,
  className = '',
  noPadding = false,
  ...rest
}) => {
  return (
    <div
      {...rest}
      className={`rounded-lg border border-slate-800 bg-slate-900 text-slate-100 shadow-sm ${noPadding ? 'p-0' : 'p-6'} ${className}`}
    >
      {(title || subtitle || headerActions || icon) && (
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start">
            {icon && <span className="mr-2 mt-0.5">{icon}</span>}
            <div>
              {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
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
