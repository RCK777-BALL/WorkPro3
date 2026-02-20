/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { upsertLocation } from '@/api/inventory';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import SlideOver from '@/components/common/SlideOver';
import type { InventoryLocation, InventoryTransferPayload, StockHistoryEntry, StockItem } from '@/types';
import {
  INVENTORY_LOCATIONS_QUERY_KEY,
  formatInventoryLocation,
  useLocationsQuery,
  useStockHistoryQuery,
  useStockItemsQuery,
  useTransferInventory,
} from '@/features/inventory';

/* Local StockHistoryList component: the features/inventory module doesn't export this,
   so we provide a simple view here that matches the usage in this page. */
const StockHistoryList = ({
  entries,
  locationMap,
  partNames,
}: {
  entries: StockHistoryEntry[];
  locationMap: Map<string, InventoryLocation>;
  partNames: Map<string, string>;
}) => (
  <div className="space-y-2">
    {!entries || entries.length === 0 ? (
      <p className="text-sm text-[var(--wp-color-text-muted)]">No history yet.</p>
    ) : (
      entries.map((entry, idx) => {
        const fallbackLocation = locationMap.get(entry.location.locationId);
        const locationLabel = formatInventoryLocation({
          store: entry.location.store ?? fallbackLocation?.store,
          room: entry.location.room ?? fallbackLocation?.room,
          bin: entry.location.bin ?? fallbackLocation?.bin,
        });
        return (
          <div
            key={entry.id ?? idx}
            className="flex items-start justify-between gap-3 rounded-md border border-[var(--wp-color-border)] p-3"
          >
            <div>
              <p className="text-sm font-medium text-[var(--wp-color-text)]">{partNames.get(entry.partId) ?? entry.partId}</p>
              <p className="text-xs text-[var(--wp-color-text-muted)]">
                {entry.delta > 0 ? '+' : ''}
                {entry.delta} • {locationLabel}
              </p>
              {entry.reason && <p className="mt-1 text-xs text-[var(--wp-color-text-muted)]">{entry.reason}</p>}
            </div>
            <div className="text-right text-xs text-[var(--wp-color-text-muted)]">
              {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
            </div>
          </div>
        );
      })
    )}
  </div>
);

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
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ barcode?: string }>({});

  useEffect(() => {
    setStore(initial?.store ?? '');
    setRoom(initial?.room ?? '');
    setBin(initial?.bin ?? '');
    setBarcode(initial?.barcode ?? '');
  }, [initial]);

  const validate = () => {
    const errors: { barcode?: string } = {};
    if (barcode) {
      const trimmed = barcode.trim();
      if (/\s/.test(barcode)) {
        errors.barcode = 'Barcode cannot include spaces';
      } else if (trimmed.length < 3) {
        errors.barcode = 'Barcode must be at least 3 characters';
      } else if (!/^[\w.-]+$/.test(trimmed)) {
        errors.barcode = 'Use letters, numbers, dashes, or dots.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const extractErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      if (response?.data?.message) return response.data.message;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Unable to save location';
  };

  const submit = async () => {
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ id: initial?.id, store, room, bin, barcode: barcode?.trim() || undefined });
      setStore('');
      setRoom('');
      setBin('');
      setBarcode('');
      setFieldErrors({});
    } catch (err) {
      setFormError(extractErrorMessage(err));
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
      <Input
        label="Barcode"
        value={barcode}
        description="Scanner-friendly identifier. Avoid spaces; use letters, numbers, dashes, or dots."
        error={fieldErrors.barcode}
        pattern="^[\\w.-]+$"
        inputMode="text"
        onChange={(e) => setBarcode(e.target.value)}
      />
      {formError && <p className="text-sm text-error-600">{formError}</p>}
      <Button onClick={submit} loading={saving} disabled={!store}>
        {initial ? 'Update location' : 'Create location'}
      </Button>
    </div>
  );
};

const StockTable = ({ items }: { items: StockItem[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-neutral-200 text-sm">
      <thead className="bg-[var(--wp-color-surface)]">
        <tr>
          <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Part</th>
          <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Location</th>
          <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Qty</th>
          <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Unit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-200">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.part?.name ?? item.partId}</td>
            <td className="px-3 py-2 text-[var(--wp-color-text)]">
              {item.location ? formatInventoryLocation(item.location) : item.locationId}
            </td>
            <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.quantity}</td>
            <td className="px-3 py-2 text-[var(--wp-color-text)]">{item.unit ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

  const locationMap = useMemo(() => new Map(locations.map((loc) => [loc.id, loc])), [locations]);

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
          <label className="text-sm font-medium text-[var(--wp-color-text)]">Part</label>
          <select
            className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
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
          <label className="text-sm font-medium text-[var(--wp-color-text)]">From location</label>
          <select
            className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            disabled={!partId}
          >
            <option value="">Select source</option>
            {sourceOptions.map((stock) => (
              <option key={stock.id} value={stock.locationId}>
                {(stock.location
                  ? formatInventoryLocation(stock.location)
                  : locationMap.has(stock.locationId)
                    ? formatInventoryLocation(locationMap.get(stock.locationId))
                    : stock.locationId)}{' '}
                (Qty {stock.quantity})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--wp-color-text)]">To location</label>
          <select
            className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            disabled={!partId}
          >
            <option value="">Select destination</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {formatInventoryLocation(loc)}
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
  const { locationId } = useParams<{ locationId?: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<InventoryLocation | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [focusedLocationId, setFocusedLocationId] = useState<string | undefined>(locationId ?? undefined);

  const locationsQuery = useLocationsQuery();
  const stockQuery = useStockItemsQuery();
  const historyQuery = useStockHistoryQuery();
  const transferMutation = useTransferInventory();

  const locations = locationsQuery.data ?? [];
  const stock = stockQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const locationMap = useMemo(() => new Map(locations.map((loc) => [loc.id, loc])), [locations]);
  const partNames = useMemo(() => {
    const map = new Map<string, string>();
    stock.forEach((item) => {
      if (item.part?.name) {
        map.set(item.partId, item.part.name);
      }
    });
    return map;
  }, [stock]);

  const locationTree = useMemo(() => {
    const tree: Record<string, Record<string, InventoryLocation[]>> = {};
    locations.forEach((loc) => {
      const storeKey = loc.store || 'Default';
      const roomKey = loc.room || 'General';
      if (!tree[storeKey]) tree[storeKey] = {};
      if (!tree[storeKey][roomKey]) tree[storeKey][roomKey] = [];
      tree[storeKey][roomKey].push(loc);
    });
    return tree;
  }, [locations]);

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

  useEffect(() => {
    setFocusedLocationId(locationId ?? undefined);
  }, [locationId]);

  return (
    <div className="space-y-6">
      {focusedLocationId && (
        <div className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900">
          <div className="mt-0.5 h-3 w-3 rounded-full bg-primary-500" />
          <div>
            <p className="font-semibold">Deep link detected</p>
            <p>
              Showing inventory data for location <strong>{focusedLocationId}</strong>. Scroll down to confirm stock.
            </p>
            {!locations.some((loc) => loc.id === focusedLocationId) && (
              <p className="text-xs text-primary-800">This location is not present in the current list.</p>
            )}
          </div>
        </div>
      )}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Inventory locations</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Organize stock across stores, rooms, and bins with a full audit history of adjustments.
        </p>
      </header>

      <Card>
        <Card.Header>
          <Card.Title>Location tree</Card.Title>
          <Card.Description>Browse nested stores, rooms, and bins and see assigned parts.</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3">
          {Object.entries(locationTree).map(([store, rooms]) => (
            <div key={store} className="space-y-2 rounded-md border border-[var(--wp-color-border)] p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[var(--wp-color-text)]">{store}</p>
                <span className="text-xs text-[var(--wp-color-text-muted)]">{Object.values(rooms).flat().length} locations</span>
              </div>
              <div className="space-y-2 pl-3">
                {Object.entries(rooms).map(([room, bins]) => (
                  <div key={room} className="space-y-1">
                    <p className="text-sm font-medium text-[var(--wp-color-text)]">Room: {room}</p>
                    <div className="space-y-2 pl-4">
                      {bins.map((loc) => {
                        const items = stock.filter((item) => item.locationId === loc.id);
                        return (
                          <div key={loc.id} className="rounded border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2">
                            <div className="flex items-center justify-between text-sm text-[var(--wp-color-text)]">
                              <span>{formatInventoryLocation(loc)}</span>
                              <button className="text-xs text-blue-600" onClick={() => setSelected(loc)}>
                                Edit
                              </button>
                            </div>
                            <div className="pl-2 text-xs text-[var(--wp-color-text-muted)]">
                              {items.length ? (
                                <ul className="list-inside list-disc">
                                  {items.map((item) => (
                                    <li key={item.id}>
                                      {item.part?.name ?? item.partId} — {item.quantity}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No parts assigned</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!locations.length && <p className="text-sm text-[var(--wp-color-text-muted)]">No locations defined yet.</p>}
        </Card.Content>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <Card.Header>
            <Card.Title>Location catalog</Card.Title>
            <Card.Description>Tap a location to edit or browse assignments.</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {locationsQuery.isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading locations…</p>}
              {locationsQuery.error ? (
                <p className="text-sm text-error-600">Unable to load locations. Please try again.</p>
              ) : null}
              {Object.entries(grouped).map(([store, list]) => (
                <div key={store} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-[var(--wp-color-text-muted)]">{store}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {list.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setSelected(loc)}
                        className="rounded-md border border-[var(--wp-color-border)] p-3 text-left hover:border-[var(--wp-color-text-muted)]"
                      >
                        <p className="font-medium text-[var(--wp-color-text)]">{formatInventoryLocation(loc)}</p>
                        <p className="text-xs text-[var(--wp-color-text-muted)]">{loc.bin ? `Bin ${loc.bin}` : 'No bin set'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!locationsQuery.isLoading && !locationsQuery.error && !locations.length && (
                <p className="text-sm text-[var(--wp-color-text-muted)]">No locations yet.</p>
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
          {stockQuery.isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading stock…</p>}
          {stockQuery.error ? <p className="text-sm text-error-600">Unable to load stock.</p> : null}
          {!stockQuery.isLoading && !stockQuery.error && <StockTable items={stock} />}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Stock history</Card.Title>
          <Card.Description>Recent adjustments and receipts.</Card.Description>
        </Card.Header>
        <Card.Content>
          {historyQuery.isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading history…</p>}
          {historyQuery.error ? <p className="text-sm text-error-600">Unable to load stock history.</p> : null}
          {!historyQuery.isLoading && !historyQuery.error && (
            <StockHistoryList entries={history} locationMap={locationMap} partNames={partNames} />
          )}
        </Card.Content>
      </Card>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        stockItems={stock}
        locations={locations}
        onSubmit={handleTransfer}
        submitting={transferMutation.isPending}
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



