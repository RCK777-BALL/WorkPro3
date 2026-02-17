/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { InventoryLocation, StockItem } from '@/types';
import { formatInventoryLocation, useLocationsQuery, useStockItemsQuery } from '@/features/inventory';

const buildLocationMap = (locations: InventoryLocation[]) =>
  new Map<string, InventoryLocation>(locations.map((location) => [location.id, location]));

const InventoryList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const siteFilter = searchParams.get('siteId') ?? 'all';
  const binFilter = searchParams.get('bin') ?? 'all';

  const locationsQuery = useLocationsQuery();
  const stockQuery = useStockItemsQuery();
  const hasStockError = Boolean(stockQuery.error);

  const locationMap = useMemo(() => buildLocationMap(locationsQuery.data ?? []), [locationsQuery.data]);

  const applyFilter = (item: StockItem) => {
    const location = item.location ?? locationMap.get(item.locationId);
    const matchesSite = siteFilter === 'all' || location?.siteId === siteFilter;
    const matchesBin = binFilter === 'all' || (location?.bin ?? 'Unassigned') === binFilter;
    return matchesSite && matchesBin;
  };

  const filteredItems = useMemo(() => (stockQuery.data ?? []).filter(applyFilter), [stockQuery.data, locationMap, siteFilter, binFilter]);

  const siteOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const location of locationMap.values()) {
      if (location.siteId) ids.add(location.siteId);
    }
    return Array.from(ids);
  }, [locationMap]);

  const binOptions = useMemo(() => {
    const bins = new Set<string>();
    for (const location of locationMap.values()) {
      if (siteFilter !== 'all' && location.siteId !== siteFilter) continue;
      if (location.bin) bins.add(location.bin);
    }
    return Array.from(bins);
  }, [locationMap, siteFilter]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const queryString = searchParams.toString();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-[var(--wp-color-text-muted)]">Inventory</p>
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Stock by location</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Filter parts by site and bin to focus on relevant stock and drill into individual movement history.
        </p>
      </header>

      <Card>
        <Card.Header>
          <Card.Title>Filters</Card.Title>
          <Card.Description>Keep selections in the URL to share filtered inventory views.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)]">
              <span>Site</span>
              <select
                className="rounded-md border border-[var(--wp-color-border)] px-2 py-1 text-sm"
                value={siteFilter}
                onChange={(event) => updateParam('siteId', event.target.value)}
              >
                <option value="all">All sites</option>
                {siteOptions.map((siteId) => (
                  <option key={siteId} value={siteId}>
                    {siteId}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)]">
              <span>Bin</span>
              <select
                className="rounded-md border border-[var(--wp-color-border)] px-2 py-1 text-sm"
                value={binFilter}
                onChange={(event) => updateParam('bin', event.target.value)}
              >
                <option value="all">All bins</option>
                {binOptions.map((bin) => (
                  <option key={bin} value={bin}>
                    {bin}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Parts</Card.Title>
          <Card.Description>Navigate to a specific part to view transaction history.</Card.Description>
        </Card.Header>
        <Card.Content>
          {stockQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]" role="status">
              <LoadingSpinner />
              <span>Loading inventory…</span>
            </div>
          )}
          {hasStockError && (
            <p className="text-sm text-error-600">Unable to load stock. Please try again.</p>
          )}

          {!stockQuery.isLoading && !hasStockError && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-[var(--wp-color-surface)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Location</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Quantity</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredItems.map((item) => {
                    const location = item.location ?? locationMap.get(item.locationId);
                    const linkTarget = `/inventory/items/${item.partId}${queryString ? `?${queryString}` : ''}`;
                    return (
                      <tr key={item.id} className="hover:bg-[var(--wp-color-surface)]">
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <Link to={linkTarget} className="text-blue-600 hover:underline">
                            {item.part?.name ?? item.partId}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          {formatInventoryLocation(location ?? undefined)}
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.quantity}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.unit ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredItems.length && (
                <p className="p-3 text-sm text-[var(--wp-color-text-muted)]">
                  {siteFilter !== 'all' || binFilter !== 'all'
                    ? 'No parts match the selected filters.'
                    : 'No stock records found yet.'}
                </p>
              )}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default InventoryList;

