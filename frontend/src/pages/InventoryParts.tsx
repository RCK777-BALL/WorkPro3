/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

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
  const [form, setForm] = useState<Partial<Part> & { name: string }>({
    name: '',
    barcode: '',
    partNo: '',
    unit: '',
    reorderPoint: 0,
    minLevel: 0,
    maxLevel: 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ barcode?: string }>({});
  const { can } = usePermissions();
  const canManageInventory = useMemo(() => can('inventory.manage'), [can]);
  const disableEdits = !canManageInventory;

  const handleChange = (key: keyof Part, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const errors: { barcode?: string } = {};
    if (form.barcode) {
      const trimmed = form.barcode.trim();
      if (/\s/.test(form.barcode)) {
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
    return 'Unable to save part';
  };

  const submit = async () => {
    if (disableEdits) return;
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ ...form, barcode: form.barcode?.trim() || undefined });
      setForm({ name: '', barcode: '', partNo: '', unit: '', reorderPoint: 0, minLevel: 0, maxLevel: 0 });
      setFieldErrors({});
    } catch (err) {
      setFormError(extractErrorMessage(err));
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
      <Input
        label="Barcode"
        value={form.barcode ?? ''}
        disabled={disableEdits}
        description="Scanner-friendly identifier. Avoid spaces; use letters, numbers, dashes, or dots."
        error={fieldErrors.barcode}
        pattern="^[\\w.-]+$"
        inputMode="text"
        onChange={(e) => handleChange('barcode', e.target.value)}
      />
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
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Min level (alert)"
          type="number"
          value={form.minLevel ?? ''}
          disabled={disableEdits}
          onChange={(e) => setForm((prev) => ({ ...prev, minLevel: Number(e.target.value) }))}
        />
        <Input
          label="Max level"
          type="number"
          value={form.maxLevel ?? ''}
          disabled={disableEdits}
          onChange={(e) => setForm((prev) => ({ ...prev, maxLevel: Number(e.target.value) }))}
        />
      </div>
      <Input
        label="Reorder point"
        type="number"
        value={form.reorderPoint ?? 0}
        disabled={disableEdits}
        onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: Number(e.target.value) }))}
      />
      {formError && <p className="text-sm text-error-600">{formError}</p>}
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
  const { partId } = useParams<{ partId?: string }>();
  const [parts, setParts] = useState<Part[]>([]);
  const [focusedPartId, setFocusedPartId] = useState<string | undefined>();

  useEffect(() => {
    fetchParts({ pageSize: 200, sortBy: 'name' }).then((response) => setParts(response.items));
  }, []);

  useEffect(() => {
    setFocusedPartId(partId ?? undefined);
  }, [partId]);

  const handleSave = async (payload: Partial<Part> & { name: string }) => {
    const saved = await upsertPart(payload);
    const next = parts.filter((p) => p.id !== saved.id);
    setParts([...next, saved]);
  };

  return (
    <div className="space-y-6">
      {focusedPartId && (
        <div className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900">
          <div className="mt-0.5 h-3 w-3 rounded-full bg-primary-500" />
          <div>
            <p className="font-semibold">Deep link detected</p>
            <p>
              Showing catalog entry for part <strong>{focusedPartId}</strong>. Use the list below to confirm details.
            </p>
            {!parts.some((part) => part.id === focusedPartId) && (
              <p className="text-xs text-primary-800">We could not find this part in the current list.</p>
            )}
          </div>
        </div>
      )}
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
                      <td className="px-3 py-2 text-neutral-900">
                        {part.name}
                        {focusedPartId === part.id && (
                          <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
                            Selected
                          </span>
                        )}
                      </td>
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
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={6}>
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
