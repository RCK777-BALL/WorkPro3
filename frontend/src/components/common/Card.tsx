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

type CardComponent = React.FC<CardProps> & {
  Header: React.FC<{ children: React.ReactNode }>;
  Content: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode }>;
  Description: React.FC<{ children: React.ReactNode }>;
};

const CardRoot: React.FC<CardProps> = ({
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
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            {icon && <span className="mt-0.5">{icon}</span>}
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

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-3 flex flex-col gap-1 border-b border-slate-800 pb-3">{children}</div>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-slate-100">{children}</h3>
);

const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-slate-300">{children}</p>
);

const Card = CardRoot as CardComponent;
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Title = CardTitle;
Card.Description = CardDescription;

export default Card;
