/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { fetchParts, upsertPart } from '@/api/inventory';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import type { Part } from '@/types';

const PartForm = ({ onSave }: { onSave: (payload: Partial<Part> & { name: string }) => Promise<void> }) => {
  const [form, setForm] = useState<Partial<Part> & { name: string }>({ name: '', partNo: '', unit: '', reorderPoint: 0 });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: keyof Part, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
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
      <Input label="Name" value={form.name} required onChange={(e) => handleChange('name', e.target.value)} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Part #" value={form.partNo ?? ''} onChange={(e) => handleChange('partNo', e.target.value)} />
        <Input label="Unit" value={form.unit ?? ''} onChange={(e) => handleChange('unit', e.target.value)} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="Cost"
          type="number"
          value={form.cost ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, cost: Number(e.target.value) }))}
        />
        <Input
          label="Min qty"
          type="number"
          value={form.minQty ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, minQty: Number(e.target.value) }))}
        />
        <Input
          label="Max qty"
          type="number"
          value={form.maxQty ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, maxQty: Number(e.target.value) }))}
        />
      </div>
      <Input
        label="Reorder point"
        type="number"
        value={form.reorderPoint ?? 0}
        onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: Number(e.target.value) }))}
      />
      <Button onClick={submit} disabled={!form.name} loading={saving}>
        Add part
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
                      <td className="px-3 py-2 text-neutral-700">{part.reorderPoint}</td>
                      <td className="px-3 py-2 text-neutral-700">{part.leadTime ?? '—'} days</td>
                    </tr>
                  ))}
                  {!parts.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                        No parts configured yet.
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
