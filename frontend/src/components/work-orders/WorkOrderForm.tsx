/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import http from '@/lib/http';
import { useDepartmentStore } from '@/store/departmentStore';
import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import type {
  WorkOrder,
  Asset,
  User,
  WorkOrderUpdatePayload,
} from '@/types';
import {
  mapChecklistsFromApi,
  mapChecklistsToApi,
  mapSignaturesFromApi,
  mapSignaturesToApi,
  type ChecklistFormValue,
  type SignatureFormValue,
} from '@/utils/workOrderTransforms';

interface WorkOrderFormProps {
  workOrder?: WorkOrder;
  onSuccess?: (wo: WorkOrder) => void;
}

const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ workOrder, onSuccess }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [techs, setTechs] = useState<User[]>([]);
  const departments = useDepartmentStore((s) => s.departments);
  const linesMap = useDepartmentStore((s) => s.linesByDepartment);
  const stationsMap = useDepartmentStore((s) => s.stationsByLine);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const fetchLines = useDepartmentStore((s) => s.fetchLines);
  const fetchStations = useDepartmentStore((s) => s.fetchStations);
  const initialDepartmentId = workOrder?.department ?? '';
  const initialLineId = workOrder?.lineId ?? workOrder?.line ?? '';
  const initialStationId = workOrder?.stationId ?? workOrder?.station ?? '';
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [lineId, setLineId] = useState(initialLineId);
  const [stationId, setStationId] = useState(initialStationId);
  const lines = departmentId ? linesMap[departmentId] || [] : [];
  const stations = lineId ? stationsMap[lineId] || [] : [];
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<WorkOrder>>({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    assetId: workOrder?.assetId || '',
    assignedTo: workOrder?.assignedTo || '',
    priority: workOrder?.priority || 'medium',
    status: workOrder?.status || 'requested',
    type: workOrder?.type || 'corrective',
    complianceProcedureId: workOrder?.complianceProcedureId || '',
    calibrationIntervalDays: workOrder?.calibrationIntervalDays,
    dueDate: workOrder?.dueDate || new Date().toISOString().split('T')[0],
  });
  const [checklists, setChecklists] = useState<ChecklistFormValue[]>(mapChecklistsFromApi(workOrder?.checklists));
  const [newChecklist, setNewChecklist] = useState('');
  const [parts, setParts] = useState<{ partId: string; qty: number; cost: number }[]>(workOrder?.partsUsed || []);
  const [newPart, setNewPart] = useState<{ partId: string; qty: number; cost: number }>({ partId: '', qty: 1, cost: 0 });
  const [signatures, setSignatures] = useState<SignatureFormValue[]>(mapSignaturesFromApi(workOrder?.signatures));
  const [newSignature, setNewSignature] = useState<SignatureFormValue>({ by: '', ts: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assetRes = await http.get('/assets');
        setAssets((assetRes.data as any[]).map(a => ({ ...a, id: a._id ?? a.id })) as Asset[]);
      } catch {
        addToast('Failed to load assets', 'error');
      }
      try {
        const userRes = await http.get('/users');
        setTechs(
          (userRes.data as any[])
            .filter((u) => {
              const roles: string[] = Array.isArray(u.roles) ? u.roles : [];
              const primary = typeof u.role === 'string' ? u.role : roles[0];
              return (
                (typeof primary === 'string' && primary.toLowerCase() === 'tech') ||
                roles.some((role) => typeof role === 'string' && role.toLowerCase() === 'tech')
              );
            })
            .map((u) => ({ ...u, id: u._id ?? u.id })) as User[],
        );
      } catch {
        addToast('Failed to load users', 'error');
      }
      try {
        await fetchDepartments();
      } catch {
        addToast('Failed to load departments', 'error');
      }
    };
    fetchData();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!departmentId) {
      setLineId('');
      setStationId('');
      return;
    }
    fetchLines(departmentId).catch(() => {
      addToast('Failed to load lines', 'error');
    });
  }, [departmentId, fetchLines]);

  useEffect(() => {
    if (!departmentId || !lineId) {
      setStationId('');
      return;
    }
    fetchStations(departmentId, lineId).catch(() => {
      addToast('Failed to load stations', 'error');
    });
  }, [departmentId, lineId, fetchStations]);

  useEffect(() => {
    if (workOrder) {
      setDepartmentId(workOrder.department ?? '');
      setLineId(workOrder.lineId ?? workOrder.line ?? '');
      setStationId(workOrder.stationId ?? workOrder.station ?? '');
      setChecklists(mapChecklistsFromApi(workOrder.checklists));
      setParts(workOrder.partsUsed || []);
      setSignatures(mapSignaturesFromApi(workOrder.signatures));
    } else {
      setDepartmentId('');
      setLineId('');
      setStationId('');
      setChecklists([]);
      setParts([]);
      setSignatures([]);
    }
  }, [workOrder]);

  useEffect(() => {
    setFormData((prev) => {
      const updates: Partial<WorkOrder> = {};
      if (prev.type !== 'calibration' && prev.calibrationIntervalDays !== undefined) {
        updates.calibrationIntervalDays = undefined;
      }
      if (!['calibration', 'safety'].includes(prev.type ?? '') && prev.complianceProcedureId) {
        updates.complianceProcedureId = '';
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checklistPayload = mapChecklistsToApi(checklists);
    const signaturePayload = mapSignaturesToApi(signatures);
    const payload = {
      title: formData.title,
      description: formData.description,
      asset: formData.assetId,
      assignedTo: formData.assignedTo,
      priority: formData.priority,
      status: formData.status,
      type: formData.type,
      complianceProcedureId: formData.complianceProcedureId || undefined,
      calibrationIntervalDays: formData.calibrationIntervalDays,
      dueDate: formData.dueDate,
      departmentId,
      lineId: lineId || undefined,
      stationId: stationId || undefined,
      checklists: checklistPayload,
      partsUsed: parts,
      signatures: signaturePayload,
    };
    try {
      let res;
      if (workOrder) {
        res = await http.put(`/workorders/${workOrder.id}`, payload);
      } else {
        res = await http.post('/workorders', payload);
      }
      const data = res.data as WorkOrderUpdatePayload;
      if (onSuccess)
        onSuccess({
          ...(data as Partial<WorkOrder>),
          id: data._id,
          checklists: mapChecklistsFromApi((data as Partial<WorkOrder>).checklists),
          signatures: mapSignaturesFromApi((data as Partial<WorkOrder>).signatures),
        } as WorkOrder);
      addToast(workOrder ? 'Work Order updated' : 'Work Order created', 'success');
    } catch {
      addToast('Failed to submit work order', 'error');
    }
  };

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Department</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={departmentId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            setDepartmentId(value);
            setLineId('');
            setStationId('');
          }}
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Line</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={lineId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            setLineId(value);
            setStationId('');
          }}
          disabled={!departmentId}
        >
          <option value="">Select Line</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Station</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={stationId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStationId(e.target.value)}
          disabled={!lineId}
        >
          <option value="">Select Station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('title', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Asset</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={formData.assetId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('assetId', e.target.value)}
        >
          <option value="">Select Asset</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Assign Team Member</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={formData.assignedTo}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('assignedTo', e.target.value)}
        >
          <option value="">Unassigned</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('priority', e.target.value as WorkOrder['priority'])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('status', e.target.value as WorkOrder['status'])}
          >
            <option value="requested">Requested</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('type', e.target.value as WorkOrder['type'])}
          >
            <option value="corrective">Corrective</option>
            <option value="preventive">Preventive</option>
            <option value="inspection">Inspection</option>
            <option value="calibration">Calibration</option>
            <option value="safety">Safety</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.dueDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('dueDate', e.target.value)}
          />
        </div>
      </div>
      {(formData.type === 'calibration' || formData.type === 'safety') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Compliance Procedure ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              value={formData.complianceProcedureId || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('complianceProcedureId', e.target.value)
              }
            />
          </div>
          {formData.type === 'calibration' && (
            <div>
              <label className="block text-sm font-medium mb-1">Calibration Interval (days)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.calibrationIntervalDays?.toString() || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  updateField(
                    'calibrationIntervalDays',
                    value ? Number(value) : undefined,
                  );
                }}
              />
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Checklists</label>
        {checklists.map((c, idx) => (
          <div key={idx} className="flex items-center space-x-2 mb-1">
            <input
              type="text"
              className="flex-1 px-2 py-1 border border-neutral-300 rounded-md"
              value={c.text}
              onChange={(e) => {
                const updated = [...checklists];
                updated[idx].text = e.target.value;
                setChecklists(updated);
              }}
            />
            <input
              type="checkbox"
              checked={c.done}
              onChange={(e) => {
                const updated = [...checklists];
                updated[idx].done = e.target.checked;
                setChecklists(updated);
              }}
            />
            <button type="button" onClick={() => setChecklists(checklists.filter((_, i) => i !== idx))}>
              Remove
            </button>
          </div>
        ))}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 px-2 py-1 border border-neutral-300 rounded-md"
            value={newChecklist}
            onChange={(e) => setNewChecklist(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (newChecklist) {
                setChecklists([...checklists, { text: newChecklist, done: false }]);
                setNewChecklist('');
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Parts Used</label>
        {parts.map((p, idx) => (
          <div key={idx} className="flex items-center space-x-2 mb-1">
            <input
              type="text"
              className="px-2 py-1 border border-neutral-300 rounded-md"
              value={p.partId}
              placeholder="Part ID"
              onChange={(e) => {
                const updated = [...parts];
                updated[idx].partId = e.target.value;
                setParts(updated);
              }}
            />
            <input
              type="number"
              className="w-20 px-2 py-1 border border-neutral-300 rounded-md"
              value={p.qty}
              onChange={(e) => {
                const updated = [...parts];
                updated[idx].qty = Number(e.target.value);
                setParts(updated);
              }}
            />
            <input
              type="number"
              className="w-24 px-2 py-1 border border-neutral-300 rounded-md"
              value={p.cost}
              onChange={(e) => {
                const updated = [...parts];
                updated[idx].cost = Number(e.target.value);
                setParts(updated);
              }}
            />
            <button type="button" onClick={() => setParts(parts.filter((_, i) => i !== idx))}>
              Remove
            </button>
          </div>
        ))}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="px-2 py-1 border border-neutral-300 rounded-md"
            value={newPart.partId}
            placeholder="Part ID"
            onChange={(e) => setNewPart((prev) => ({ ...prev, partId: e.target.value }))}
          />
          <input
            type="number"
            className="w-20 px-2 py-1 border border-neutral-300 rounded-md"
            value={newPart.qty}
            onChange={(e) => setNewPart((prev) => ({ ...prev, qty: Number(e.target.value) }))}
          />
          <input
            type="number"
            className="w-24 px-2 py-1 border border-neutral-300 rounded-md"
            value={newPart.cost}
            onChange={(e) => setNewPart((prev) => ({ ...prev, cost: Number(e.target.value) }))}
          />
          <button
            type="button"
            onClick={() => {
              if (newPart.partId) {
                setParts([...parts, newPart]);
                setNewPart({ partId: '', qty: 1, cost: 0 });
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Signatures</label>
        {signatures.map((s, idx) => (
          <div key={idx} className="flex items-center space-x-2 mb-1">
            <input
              type="text"
              className="px-2 py-1 border border-neutral-300 rounded-md"
              value={s.by}
              placeholder="User ID"
              onChange={(e) => {
                const updated = [...signatures];
                updated[idx].by = e.target.value;
                setSignatures(updated);
              }}
            />
            <input
              type="datetime-local"
              className="px-2 py-1 border border-neutral-300 rounded-md"
              value={s.ts}
              onChange={(e) => {
                const updated = [...signatures];
                updated[idx].ts = e.target.value;
                setSignatures(updated);
              }}
            />
            <button
              type="button"
              onClick={() => setSignatures(signatures.filter((_, i) => i !== idx))}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="px-2 py-1 border border-neutral-300 rounded-md"
            value={newSignature.by}
            placeholder="User ID"
            onChange={(e) => setNewSignature((prev) => ({ ...prev, by: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="px-2 py-1 border border-neutral-300 rounded-md"
            value={newSignature.ts}
            onChange={(e) => setNewSignature((prev) => ({ ...prev, ts: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => {
              if (newSignature.by && newSignature.ts) {
                setSignatures([...signatures, newSignature]);
                setNewSignature({ by: '', ts: '' });
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          rows={4}
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('description', e.target.value)}
        />
      </div>
      <div className="pt-4">
        <Button type="submit" variant="primary">
          {workOrder ? 'Update Work Order' : 'Create Work Order'}
        </Button>
      </div>
    </form>
  );
};

export default WorkOrderForm;
