/*
 * SPDX-License-Identifier: MIT
 */

import { Home, Link2 } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useScopeContext } from '@/context/ScopeContext';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const isDynamicSegment = (segment: string) => /[0-9a-f]{6,}|\d{3,}/i.test(segment);

const ContextBreadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeTenant, activePlant, loadingTenants, loadingPlants, errors } = useScopeContext();

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: t('breadcrumbs.home'), path: '/dashboard' }];
    let currentPath = '';

    parts.forEach((part) => {
      currentPath += `/${part}`;
      const normalized = decodeURIComponent(part);
      const labelMap: Record<string, string> = {
        dashboard: t('breadcrumbs.dashboard'),
        analytics: t('breadcrumbs.analytics'),
        pm: 'PM analytics',
        iot: t('breadcrumbs.iot'),
        'work-orders': t('breadcrumbs.workOrders'),
        workorders: t('breadcrumbs.workOrders'),
        assets: t('breadcrumbs.assets'),
        inventory: t('breadcrumbs.inventory'),
        settings: t('breadcrumbs.settings'),
        admin: t('breadcrumbs.admin'),
        tenants: t('breadcrumbs.tenants'),
      };
      const label = labelMap[normalized] ?? (isDynamicSegment(normalized) ? t('breadcrumbs.details') : normalized);
      if (!items.some((crumb) => crumb.path === currentPath)) {
        items.push({ label, path: currentPath });
      }
    });

    return items;
  }, [location.pathname, t]);

  return (
    <div className="rounded-xl border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_80%,transparent)] px-4 py-3 text-[var(--wp-color-text)] shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" role="navigation" aria-label={t('context.breadcrumbsLabel')}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--wp-color-text-muted)]" data-testid="breadcrumbs">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={crumb.path}>
                <button
                  type="button"
                  onClick={() => navigate(crumb.path)}
                  disabled={isLast}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-left transition disabled:cursor-default disabled:text-[var(--wp-color-text)] enabled:hover:bg-[var(--wp-color-surface-elevated)]"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {index === 0 ? <Home size={14} aria-hidden /> : <Link2 size={14} aria-hidden />}
                  <span className="truncate text-xs font-medium" title={crumb.label}>
                    {crumb.label}
                  </span>
                </button>
                {!isLast && <span className="text-[var(--wp-color-text-muted)]">/</span>}
              </Fragment>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <div className="flex items-center gap-2 rounded-md border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface-elevated)_70%,transparent)] px-3 py-2 text-xs md:text-sm">
            <span className="text-[var(--wp-color-text-muted)]">{t('context.tenant')}</span>
            <span className="font-semibold text-[var(--wp-color-text)]">
              {loadingTenants ? t('context.loading') : errors.tenant ?? activeTenant?.name ?? t('context.unassigned')}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface-elevated)_70%,transparent)] px-3 py-2 text-xs md:text-sm">
            <span className="text-[var(--wp-color-text-muted)]">{t('context.site')}</span>
            <span className="font-semibold text-[var(--wp-color-text)]">
              {loadingPlants ? t('context.loading') : errors.plant ?? activePlant?.name ?? t('context.unassigned')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextBreadcrumbs;
