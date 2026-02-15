/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import clsx from 'clsx';
import Button from '@/components/common/Button';

type PageHeaderFilter = {
  id: string;
  label: string;
  value?: string;
  onClear?: () => void;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: PageHeaderFilter[];
  dense?: boolean;
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, filters, dense = false }) => {
  const activeFilters = filters?.filter((filter) => filter.value);

  return (
    <section
      className={clsx(
        'rounded-3xl border border-slate-800/80 bg-slate-900/60 px-5 py-4 text-white shadow-lg backdrop-blur',
        dense && 'py-3',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-white/70">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {activeFilters && activeFilters.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1"
            >
              <span className="font-medium text-white/80">{filter.label}</span>
              <span className="text-white">{filter.value}</span>
              {filter.onClear ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="h-5 px-2 text-xs text-white/70 hover:text-white"
                  onClick={filter.onClear}
                >
                  Clear
                </Button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default PageHeader;
