/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';

import Button from '@/components/common/Button';
import type { Part } from '@/types';
import { usePartsQuery, useVendorsQuery } from './hooks';
import { QrLabel } from '@/components/qr';
import { StockLevelBadge } from './AlertIndicators';

const matchSearch = (part: Part, term: string) => {
  const haystack = [
    part.name,
    part.sku,
    part.partNumber,
    part.category,
    part.vendor?.name,
    part.assets?.map((asset) => asset.name).join(' '),
    part.pmTemplates?.map((template) => template.title).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term.toLowerCase());
};

const severityClass: Record<string, string> = {
  critical: 'bg-error-50 text-error-700',
  warning: 'bg-warning-50 text-warning-700',
  ok: 'bg-success-50 text-success-700',
};

const formatLocation = (location?: { store?: string; room?: string; bin?: string }) => {
  if (!location) return 'Unassigned';
  const parts = [location.store, location.room, location.bin].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Unassigned';
};

const PartsTableView = () => {
  const partsQuery = usePartsQuery();
  const vendorsQuery = useVendorsQuery();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');

  const parts = partsQuery.data ?? [];
  const vendorOptions = vendorsQuery.data ?? [];

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      if (vendorFilter !== 'all' && part.vendorId !== vendorFilter) {
        return false;
      }
      if (!search.trim()) {
        return true;
      }
      return matchSearch(part, search.trim());
    });
  }, [parts, search, vendorFilter]);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-neutral-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Parts</h2>
          <p className="text-sm text-neutral-500">Linked assets and PM templates stay visible here.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span>Vendor</span>
            <select
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              value={vendorFilter}
              onChange={(event) => setVendorFilter(event.target.value)}
            >
              <option value="all">All vendors</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            placeholder="Search parts, assets, templates"
            className="min-w-[200px] rounded-md border border-neutral-300 px-3 py-1 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCcw size={14} />}
            onClick={() => partsQuery.refetch()}
            loading={partsQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>
      {partsQuery.isLoading && <p className="p-4 text-sm text-neutral-500">Loading current stock…</p>}
      {partsQuery.error && (
        <p className="p-4 text-sm text-error-600">Unable to load inventory. Please try again.</p>
      )}
      {!partsQuery.isLoading && !partsQuery.error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Linked assets</th>
                <th className="px-4 py-3">PM templates</th>
                <th className="px-4 py-3">Auto reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredParts.map((part) => (
                <tr
                  key={part.id}
                  className={part.alertState?.needsReorder ? 'bg-warning-50/40' : undefined}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{part.name}</p>
                    <p className="text-xs text-neutral-500">SKU {part.sku ?? 'n/a'}</p>
                    <div className="pt-2">
                      <QrLabel
                        name={part.name}
                        subtitle={part.vendor?.name ?? 'Part label'}
                        qrValue={part.qrCode ?? JSON.stringify({ type: 'part', id: part.id })}
                        showPreview={false}
                        buttonLabel="Print QR Label"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {part.vendor ? (
                      <div>
                        <p className="font-medium text-neutral-900">{part.vendor.name}</p>
                        {part.vendor.leadTimeDays && (
                          <p className="text-xs text-neutral-500">Lead time {part.vendor.leadTimeDays} day(s)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-neutral-400">Unassigned</p>
                    )}
                  </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        severityClass[part.alertState?.severity ?? 'ok']
                      }`}
                    >
                      {part.quantity} pcs
                    </span>
                    <p className="text-xs text-neutral-500">Reorder @ {part.reorderPoint}</p>
                    {part.stockByLocation?.length ? (
                      <div className="rounded-md bg-neutral-50 p-2">
                        <p className="text-[11px] font-semibold uppercase text-neutral-500">By location</p>
                        <ul className="space-y-1 text-xs text-neutral-700">
                          {part.stockByLocation.map((stock) => (
                            <li
                              key={stock.stockItemId}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{formatLocation(stock.location)}</span>
                              <span className="text-neutral-500">{stock.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">No location assignments</p>
                    )}
                  </div>
                </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {part.assets && part.assets.length > 0 ? (
                      <ul className="list-inside list-disc text-xs text-neutral-600">
                        {part.assets.slice(0, 3).map((asset) => (
                          <li key={asset.id}>{asset.name}</li>
                        ))}
                        {part.assets.length > 3 && (
                          <li className="text-neutral-400">+{part.assets.length - 3} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-400">No linked assets</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {part.pmTemplates && part.pmTemplates.length > 0 ? (
                      <ul className="list-inside list-disc text-xs text-neutral-600">
                        {part.pmTemplates.slice(0, 3).map((template) => (
                          <li key={template.id}>{template.title}</li>
                        ))}
                        {part.pmTemplates.length > 3 && (
                          <li className="text-neutral-400">+{part.pmTemplates.length - 3} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-400">Not in templates</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {part.autoReorder ? (
                      <p className="text-success-600">Enabled</p>
                    ) : (
                      <p className="text-neutral-400">Off</p>
                    )}
                    {part.lastAutoReorderAt && (
                      <p className="text-[11px] text-neutral-400">
                        Last {new Date(part.lastAutoReorderAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
                    No parts matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PartsTableView;
