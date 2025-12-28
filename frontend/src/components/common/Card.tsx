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
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Title: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
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
}: CardProps) => {
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

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <div
    {...rest}
    className={`mb-3 flex flex-col gap-1 border-b border-slate-800 pb-3 ${className}`.trim()}
  >
    {children}
  </div>
);

const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <div {...rest} className={className}>
    {children}
  </div>
);

const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <h3 {...rest} className={`text-lg font-semibold text-slate-100 ${className}`.trim()}>
    {children}
  </h3>
);

const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <p {...rest} className={`text-sm text-slate-300 ${className}`.trim()}>
    {children}
  </p>
);

const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <div {...rest} className={`border-t border-slate-800 pt-3 ${className}`.trim()}>
    {children}
  </div>
);

const Card = CardRoot as CardComponent;
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Footer = CardFooter;

export default Card;
