/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

type CardComponent = React.FC<CardProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Title: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  Content: React.FC<React.HTMLAttributes<HTMLDivElement>>;
};

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

const Card: CardComponent = ({
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

const Header: CardComponent['Header'] = ({ children, className = '', ...rest }) => (
  <div className={`space-y-1 ${className}`} {...rest}>
    {children}
  </div>
);

const Title: CardComponent['Title'] = ({ children, className = '', ...rest }) => (
  <h3 className={`text-lg font-semibold text-slate-100 ${className}`} {...rest}>
    {children}
  </h3>
);

const Description: CardComponent['Description'] = ({ children, className = '', ...rest }) => (
  <p className={`text-sm text-slate-300 ${className}`} {...rest}>
    {children}
  </p>
);

const Content: CardComponent['Content'] = ({ children, className = '', ...rest }) => (
  <div className={className} {...rest}>
    {children}
  </div>
);

Card.Header = Header;
Card.Title = Title;
Card.Description = Description;
Card.Content = Content;

export default Card;
