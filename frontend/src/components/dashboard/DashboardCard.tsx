/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Card from '@/components/common/Card';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  linkTo?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  change,
  linkTo,
}) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (linkTo) navigate(linkTo);
  };
  const Wrapper: React.ElementType = linkTo ? 'button' : 'div';
  const isPositive = change && !change.startsWith('-');

  return (
    <Wrapper
      onClick={linkTo ? handleClick : undefined}
      className={linkTo ? 'w-full text-left' : undefined}
      type={linkTo ? 'button' : undefined}
    >
      <Card
        className={`h-full transition-all duration-150 ${
          linkTo
            ? 'cursor-pointer hover:border-primary-300 hover:shadow-md dark:hover:border-primary-700'
            : ''
        }`}
      >
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</h3>
        <p className="text-2xl font-semibold mt-1 text-neutral-900 dark:text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-neutral-700 dark:text-neutral-300">{subtitle}</p>
        )}
        {change && (
          <div className="flex items-center mt-1">
            {isPositive ? (
              <ArrowUp size={14} className="text-success-500" />
            ) : (
              <ArrowDown size={14} className="text-error-500" />
            )}
            <span
              className={`text-xs font-medium ml-1 ${
                isPositive ? 'text-success-500' : 'text-error-500'
              }`}
            >
              {change}
            </span>
          </div>
        )}
      </Card>
    </Wrapper>
  );
};

export default DashboardCard;
