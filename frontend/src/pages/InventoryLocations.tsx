/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import {
  fetchLocations,
  fetchStockHistory,
  fetchStockItems,
  upsertLocation,
} from '@/api/inventory';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import type { InventoryLocation, StockHistoryEntry, StockItem } from '@/types';

const LocationForm = ({
  onSave,
  initial,
}: {
  onSave: (payload: Partial<InventoryLocation>) => Promise<void>;
  initial?: InventoryLocation | null;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [store, setStore] = useState(initial?.store ?? '');
  const [room, setRoom] = useState(initial?.room ?? '');
  const [bin, setBin] = useState(initial?.bin ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setStore(initial?.store ?? '');
    setRoom(initial?.room ?? '');
    setBin(initial?.bin ?? '');
  }, [initial]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ id: initial?.id, name, store, room, bin });
      setName('');
      setStore('');
      setRoom('');
      setBin('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Store" value={store} onChange={(e) => setStore(e.target.value)} />
        <Input label="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
        <Input label="Bin" value={bin} onChange={(e) => setBin(e.target.value)} />
      </div>
      <Button onClick={submit} loading={saving} disabled={!name}>
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
            <td className="px-3 py-2 text-neutral-700">{item.location?.name ?? item.locationId}</td>
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
        {entry.reason && <p className="text-xs text-neutral-500">{entry.reason}</p>}
      </div>
    ))}
    {!entries.length && <p className="text-sm text-neutral-500">No stock movements logged yet.</p>}
  </div>
);

export default function InventoryLocations() {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selected, setSelected] = useState<InventoryLocation | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);

  useEffect(() => {
    fetchLocations().then(setLocations);
    fetchStockItems().then(setStock);
    fetchStockHistory().then(setHistory);
  }, []);

  const grouped = useMemo(() => locations.reduce<Record<string, InventoryLocation[]>>((acc, loc) => {
    const key = loc.store ?? 'Default';
    acc[key] = acc[key] ? [...acc[key], loc] : [loc];
    return acc;
  }, {}), [locations]);

  const handleSave = async (payload: Partial<InventoryLocation>) => {
    const saved = await upsertLocation(payload as InventoryLocation & { name: string });
    const next = locations.filter((loc) => loc.id !== saved.id);
    setLocations([...next, saved]);
    setSelected(null);
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
                        <p className="font-medium text-neutral-900">{loc.name}</p>
                        <p className="text-xs text-neutral-500">{[loc.room, loc.bin].filter(Boolean).join(' • ') || 'No room/bin set'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!locations.length && <p className="text-sm text-neutral-500">No locations yet.</p>}
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
          <Card.Title>Stock by location</Card.Title>
          <Card.Description>Understand where inventory lives and how it is moving.</Card.Description>
        </Card.Header>
        <Card.Content>
          <StockTable items={stock} />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Stock history</Card.Title>
          <Card.Description>Recent adjustments and receipts.</Card.Description>
        </Card.Header>
        <Card.Content>
          <HistoryList entries={history} />
        </Card.Content>
      </Card>
    </div>
  );
}
