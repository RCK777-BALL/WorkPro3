/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';

import { fetchParts, upsertPart } from '@/api/inventory';
import { usePermissions } from '@/auth/usePermissions';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import type { Part } from '@/types';

const formatLocation = (location?: { store?: string; room?: string; bin?: string }) => {
  if (!location) return 'Unassigned';
  const parts = [location.store, location.room, location.bin].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Unassigned';
};

const PartForm = ({ onSave }: { onSave: (payload: Partial<Part> & { name: string }) => Promise<void> }) => {
  const [form, setForm] = useState<Partial<Part> & { name: string }>({ name: '', partNo: '', unit: '', reorderPoint: 0 });
  const [saving, setSaving] = useState(false);
  const { can } = usePermissions();
  const canManageInventory = useMemo(() => can('inventory.manage'), [can]);
  const disableEdits = !canManageInventory;

  const handleChange = (key: keyof Part, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (disableEdits) return;
    setSaving(true);
    try {
      await onSave(form);
      setForm({ name: '', partNo: '', unit: '', reorderPoint: 0 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input
        label="Name"
        value={form.name}
        required
        disabled={disableEdits}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Part #"
          value={form.partNo ?? ''}
          disabled={disableEdits}
          onChange={(e) => handleChange('partNo', e.target.value)}
        />
        <Input
          label="Unit"
          value={form.unit ?? ''}
          disabled={disableEdits}
          onChange={(e) => handleChange('unit', e.target.value)}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="Cost"
          type="number"
          value={form.cost ?? ''}
          disabled={disableEdits}
          onChange={(e) => setForm((prev) => ({ ...prev, cost: Number(e.target.value) }))}
        />
        <Input
          label="Min qty"
          type="number"
          value={form.minQty ?? ''}
          disabled={disableEdits}
          onChange={(e) => setForm((prev) => ({ ...prev, minQty: Number(e.target.value) }))}
        />
        <Input
          label="Max qty"
          type="number"
          value={form.maxQty ?? ''}
          disabled={disableEdits}
          onChange={(e) => setForm((prev) => ({ ...prev, maxQty: Number(e.target.value) }))}
        />
      </div>
      <Input
        label="Reorder point"
        type="number"
        value={form.reorderPoint ?? 0}
        disabled={disableEdits}
        onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: Number(e.target.value) }))}
      />
      <Button
        type="button"
        className="w-full"
        onClick={submit}
        disabled={!form.name || disableEdits}
        loading={saving}
      >
        {disableEdits ? 'View only' : 'Save part'}
      </Button>
    </div>
  );
};

export default function InventoryParts() {
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    fetchParts().then(setParts);
  }, []);

  const handleSave = async (payload: Partial<Part> & { name: string }) => {
    const saved = await upsertPart(payload);
    const next = parts.filter((p) => p.id !== saved.id);
    setParts([...next, saved]);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Parts library</h1>
        <p className="text-sm text-neutral-500">Part records include unit, costing, and reorder limits.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
        <Card>
          <Card.Header>
            <Card.Title>Add / update parts</Card.Title>
            <Card.Description>Capture enterprise-grade details for planning and procurement.</Card.Description>
          </Card.Header>
          <Card.Content>
            <PartForm onSave={handleSave} />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Parts catalog</Card.Title>
            <Card.Description>Live quantities with min/max safeguards.</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Part #</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Locations</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Reorder</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Lead time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {parts.map((part) => (
                    <tr key={part.id}>
                      <td className="px-3 py-2 text-neutral-900">{part.name}</td>
                      <td className="px-3 py-2 text-neutral-700">{part.partNo ?? part.partNumber ?? '—'}</td>
                      <td className="px-3 py-2 text-neutral-700">{part.quantity}</td>
                      <td className="px-3 py-2 text-neutral-700">
                        {part.stockByLocation?.length ? (
                          <ul className="space-y-1 text-xs text-neutral-700">
                            {part.stockByLocation.map((stock) => (
                              <li key={stock.stockItemId} className="flex items-center justify-between gap-2">
                                <span>{formatLocation(stock.location)}</span>
                                <span className="text-neutral-500">{stock.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-neutral-400">No location data</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{part.reorderPoint}</td>
                      <td className="px-3 py-2 text-neutral-700">{part.leadTime ?? '—'} days</td>
                    </tr>
                  ))}
                  {!parts.length && (
                    <tr>
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={5}>
                        No parts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
