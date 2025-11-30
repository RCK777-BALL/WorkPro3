/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';

import { upsertLocation } from '@/api/inventory';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import SlideOver from '@/components/common/SlideOver';
import type { InventoryLocation, InventoryTransferPayload, StockHistoryEntry, StockItem } from '@/types';
import {
  INVENTORY_HISTORY_QUERY_KEY,
  INVENTORY_LOCATIONS_QUERY_KEY,
  INVENTORY_STOCK_QUERY_KEY,
  useLocationsQuery,
  useStockHistoryQuery,
  useStockItemsQuery,
  useTransferInventory,
} from '@/features/inventory';

const formatLocation = (location: Pick<InventoryLocation, 'store' | 'room' | 'bin'>) => {
  const parts = [location.store, location.room, location.bin].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Unassigned';
};

const LocationForm = ({
  onSave,
  initial,
}: {
  onSave: (payload: Partial<InventoryLocation> & { store: string }) => Promise<void>;
  initial?: InventoryLocation | null;
}) => {
  const [store, setStore] = useState(initial?.store ?? '');
  const [room, setRoom] = useState(initial?.room ?? '');
  const [bin, setBin] = useState(initial?.bin ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStore(initial?.store ?? '');
    setRoom(initial?.room ?? '');
    setBin(initial?.bin ?? '');
  }, [initial]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ id: initial?.id, store, room, bin });
      setStore('');
      setRoom('');
      setBin('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Store" value={store} onChange={(e) => setStore(e.target.value)} required />
        <Input label="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
        <Input label="Bin" value={bin} onChange={(e) => setBin(e.target.value)} />
      </div>
      <Button onClick={submit} loading={saving} disabled={!store}>
        {initial ? 'Update location' : 'Create location'}
      </Button>
    </div>
  );
};

const StockTable = ({ items }: { items: StockItem[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-neutral-200 text-sm">
      <thead className="bg-neutral-50">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-neutral-700">Part</th>
          <th className="px-3 py-2 text-left font-medium text-neutral-700">Location</th>
          <th className="px-3 py-2 text-left font-medium text-neutral-700">Qty</th>
          <th className="px-3 py-2 text-left font-medium text-neutral-700">Unit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-200">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-2 text-neutral-900">{item.part?.name ?? item.partId}</td>
            <td className="px-3 py-2 text-neutral-700">
              {item.location ? formatLocation(item.location) : item.locationId}
            </td>
            <td className="px-3 py-2 text-neutral-700">{item.quantity}</td>
            <td className="px-3 py-2 text-neutral-700">{item.unit ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HistoryList = ({ entries }: { entries: StockHistoryEntry[] }) => (
  <div className="space-y-2">
    {entries.map((entry) => (
      <div key={entry.id} className="rounded-md border border-neutral-200 p-3">
        <div className="flex items-center justify-between text-sm text-neutral-700">
          <span>
            {entry.delta > 0 ? '+' : ''}
            {entry.delta} on {entry.partId}
          </span>
          <span className="text-xs text-neutral-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {formatLocation({
            store: entry.location.store ?? 'Unassigned',
            room: entry.location.room,
            bin: entry.location.bin,
          })}
        </p>
        {entry.reason && <p className="text-xs text-neutral-500">{entry.reason}</p>}
      </div>
    ))}
    {!entries.length && <p className="text-sm text-neutral-500">No stock movements logged yet.</p>}
  </div>
);

const TransferModal = ({
  open,
  onClose,
  stockItems,
  locations,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  stockItems: StockItem[];
  locations: InventoryLocation[];
  onSubmit: (payload: InventoryTransferPayload) => Promise<void>;
  submitting: boolean;
  error?: string | null;
}) => {
  const [partId, setPartId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  const partOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const stock of stockItems) {
      if (!map.has(stock.partId)) {
        map.set(stock.partId, stock.part?.name ?? stock.partId);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [stockItems]);

  const sourceOptions = useMemo(
    () => stockItems.filter((stock) => stock.partId === partId && stock.quantity > 0),
    [partId, stockItems],
  );

  const availableQty = sourceOptions.find((entry) => entry.locationId === fromLocationId)?.quantity ?? 0;

  const resetState = () => {
    setPartId('');
    setFromLocationId('');
    setToLocationId('');
    setQuantity(1);
    setFormError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validate = () => {
    if (!partId) return 'Select a part to transfer';
    if (!fromLocationId) return 'Choose a source location';
    if (!toLocationId) return 'Choose a destination location';
    if (fromLocationId === toLocationId) return 'Source and destination must be different';
    if (quantity <= 0) return 'Quantity must be greater than zero';
    if (availableQty < quantity) return 'Insufficient quantity at source location';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    await onSubmit({ partId, fromLocationId, toLocationId, quantity });
    resetState();
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title="Transfer stock"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Transfer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-200">Part</label>
          <select
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            value={partId}
            onChange={(e) => {
              setPartId(e.target.value);
              setFromLocationId('');
            }}
          >
            <option value="">Select part</option>
            {partOptions.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-200">From location</label>
          <select
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            disabled={!partId}
          >
            <option value="">Select source</option>
            {sourceOptions.map((stock) => (
              <option key={stock.id} value={stock.locationId}>
                {stock.location?.name ?? stock.locationId} (Qty {stock.quantity})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-200">To location</label>
          <select
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            disabled={!partId}
          >
            <option value="">Select destination</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {[loc.store, loc.room, loc.bin].filter(Boolean).join(' • ')}
              </option>
            ))}
          </select>
        </div>

        <Input
          type="number"
          label="Quantity"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          helperText={availableQty ? `Available: ${availableQty}` : undefined}
        />

        {(formError || error) && (
          <p className="text-sm text-error-300">{formError ?? error}</p>
        )}
      </div>
    </SlideOver>
  );
};

export default function InventoryLocations() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<InventoryLocation | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const locationsQuery = useLocationsQuery();
  const stockQuery = useStockItemsQuery();
  const historyQuery = useStockHistoryQuery();
  const transferMutation = useTransferInventory();

  const locations = locationsQuery.data ?? [];
  const stock = stockQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const grouped = useMemo(
    () =>
      locations.reduce<Record<string, InventoryLocation[]>>((acc, loc) => {
        const key = loc.store ?? 'Default';
        acc[key] = acc[key] ? [...acc[key], loc] : [loc];
        return acc;
      }, {}),
    [locations],
  );

  const handleSave = async (payload: Partial<InventoryLocation> & { store: string }) => {
    const saved = await upsertLocation(payload);
    queryClient.setQueryData<InventoryLocation[]>(INVENTORY_LOCATIONS_QUERY_KEY, (prev) => {
      const next = (prev ?? []).filter((loc) => loc.id !== saved.id);
      return [...next, saved];
    });
    setSelected(null);
  };

  const handleTransfer = async (payload: InventoryTransferPayload) => {
    await transferMutation.mutateAsync(payload);
    setTransferOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Inventory locations</h1>
        <p className="text-sm text-neutral-500">
          Organize stock across stores, rooms, and bins with a full audit history of adjustments.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <Card.Header>
            <Card.Title>Location catalog</Card.Title>
            <Card.Description>Tap a location to edit or browse assignments.</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {locationsQuery.isLoading && <p className="text-sm text-neutral-500">Loading locations…</p>}
              {locationsQuery.error && (
                <p className="text-sm text-error-600">Unable to load locations. Please try again.</p>
              )}
              {Object.entries(grouped).map(([store, list]) => (
                <div key={store} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-neutral-500">{store}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {list.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setSelected(loc)}
                        className="rounded-md border border-neutral-200 p-3 text-left hover:border-neutral-400"
                      >
                        <p className="font-medium text-neutral-900">{formatLocation(loc)}</p>
                        <p className="text-xs text-neutral-500">{loc.bin ? `Bin ${loc.bin}` : 'No bin set'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!locationsQuery.isLoading && !locationsQuery.error && !locations.length && (
                <p className="text-sm text-neutral-500">No locations yet.</p>
              )}
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
          <Card.Title>{selected ? 'Edit location' : 'New location'}</Card.Title>
            <Card.Description>Define store, room, and bin to support multi-level stock.</Card.Description>
          </Card.Header>
          <Card.Content>
            <LocationForm onSave={handleSave} initial={selected} />
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Card.Title>Stock by location</Card.Title>
              <Card.Description>Understand where inventory lives and how it is moving.</Card.Description>
            </div>
            <Button onClick={() => setTransferOpen(true)} variant="outline">
              Transfer stock
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {stockQuery.isLoading && <p className="text-sm text-neutral-500">Loading stock…</p>}
          {stockQuery.error && <p className="text-sm text-error-600">Unable to load stock.</p>}
          {!stockQuery.isLoading && !stockQuery.error && <StockTable items={stock} />}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Stock history</Card.Title>
          <Card.Description>Recent adjustments and receipts.</Card.Description>
        </Card.Header>
        <Card.Content>
          {historyQuery.isLoading && <p className="text-sm text-neutral-500">Loading history…</p>}
          {historyQuery.error && <p className="text-sm text-error-600">Unable to load stock history.</p>}
          {!historyQuery.isLoading && !historyQuery.error && <HistoryList entries={history} />}
        </Card.Content>
      </Card>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        stockItems={stock}
        locations={locations}
        onSubmit={handleTransfer}
        submitting={transferMutation.isLoading}
        error={
          transferMutation.isError
            ? transferMutation.error instanceof Error
              ? transferMutation.error.message
              : 'Unable to transfer stock'
            : null
        }
      />
    </div>
  );
}
