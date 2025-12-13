/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatInventoryLocation, StockHistoryList, useLocationsQuery, usePartQuery, useStockHistoryQuery, useStockItemsQuery } from '@/features/inventory';
import type { InventoryLocation, StockHistoryEntry } from '@/types';

const PAGE_SIZE = 5;

const buildLocationMap = (locations: InventoryLocation[]) =>
  new Map<string, InventoryLocation>(locations.map((location) => [location.id, location]));

const InventoryPartDetail = () => {
  const { partId } = useParams();
  const [searchParams] = useSearchParams();
  const siteFilter = searchParams.get('siteId') ?? 'all';
  const binFilter = searchParams.get('bin') ?? 'all';

  const partQuery = usePartQuery(partId);
  const stockHistoryQuery = useStockHistoryQuery();
  const stockQuery = useStockItemsQuery();
  const locationsQuery = useLocationsQuery();

  const locationMap = useMemo(() => buildLocationMap(locationsQuery.data ?? []), [locationsQuery.data]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [siteFilter, binFilter, partId]);

  const partStock = useMemo(
    () => (stockQuery.data ?? []).filter((item) => item.partId === partId),
    [partId, stockQuery.data],
  );

  const filteredHistory: StockHistoryEntry[] = useMemo(() => {
    const entries = (stockHistoryQuery.data ?? []).filter((entry) => entry.partId === partId);
    return entries.filter((entry) => {
      const locationSiteId = locationMap.get(entry.location.locationId)?.siteId;
      const matchesSite = siteFilter === 'all' || locationSiteId === siteFilter;
      const binValue = entry.location.bin ?? locationMap.get(entry.location.locationId)?.bin;
      const matchesBin = binFilter === 'all' || binValue === binFilter;
      return matchesSite && matchesBin;
    });
  }, [stockHistoryQuery.data, partId, siteFilter, binFilter, locationMap]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const queryString = searchParams.toString();
  const backLink = `/inventory/items${queryString ? `?${queryString}` : ''}`;

  const totalQuantity = partStock.reduce((sum, stock) => sum + stock.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Inventory</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Part details</h1>
          <p className="text-sm text-neutral-600">Site and bin filters carry through to history and navigation.</p>
        </div>
        <Link to={backLink} className="text-sm text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>{partQuery.data?.name ?? 'Loading part…'}</Card.Title>
          <Card.Description>Core fields and live stock totals.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-2">
          {(partQuery.isLoading || stockQuery.isLoading) && (
            <div className="flex items-center gap-2 text-sm text-neutral-600" role="status">
              <LoadingSpinner />
              <span>Loading part details…</span>
            </div>
          )}
          {partQuery.error && <p className="text-sm text-error-600">Unable to load part details.</p>}
          {!partQuery.isLoading && !partQuery.error && partQuery.data && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-neutral-500">Part number</p>
                <p className="font-medium text-neutral-900">{partQuery.data.partNo ?? partQuery.data.partNumber ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Reorder point</p>
                <p className="font-medium text-neutral-900">{partQuery.data.reorderPoint}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Unit cost</p>
                <p className="font-medium text-neutral-900">{partQuery.data.unitCost ?? partQuery.data.cost ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Total on hand</p>
                <p className="font-medium text-neutral-900">{totalQuantity}</p>
              </div>
            </div>
          )}

          {!partQuery.isLoading && !partQuery.error && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-900">Stock by location</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {partStock.map((stock) => {
                      const location = stock.location ?? locationMap.get(stock.locationId);
                      return (
                        <tr key={stock.id}>
                          <td className="px-3 py-2 text-neutral-700">{formatInventoryLocation(location ?? undefined)}</td>
                          <td className="px-3 py-2 text-neutral-700">{stock.quantity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!partStock.length && <p className="p-3 text-sm text-neutral-500">No stock items recorded for this part.</p>}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Transaction history</Card.Title>
          <Card.Description>Paginated movements filtered by site and bin.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3">
          {stockHistoryQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-neutral-600" role="status">
              <LoadingSpinner />
              <span>Loading history…</span>
            </div>
          )}
          {stockHistoryQuery.error && (
            <p className="text-sm text-error-600">Unable to load transaction history.</p>
          )}

          {!stockHistoryQuery.isLoading && !stockHistoryQuery.error && (
            <>
              <StockHistoryList entries={paginatedHistory} />
              <div className="flex items-center gap-3 text-sm text-neutral-700">
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default InventoryPartDetail;

