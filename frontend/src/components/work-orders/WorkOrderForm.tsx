import React, { useEffect, useState } from 'react';
import http from '../../lib/http';
import { useDepartmentStore } from '../../store/departmentStore';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import type {
  WorkOrder,
  Asset,
  User,
  WorkOrderUpdatePayload,
  Department,
  Line,
  Station,
} from '../../types';

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
  const [departmentId, setDepartmentId] = useState('');
  const [lineId, setLineId] = useState('');
  const [stationId, setStationId] = useState('');
  const lines = departmentId ? linesMap[departmentId] || [] : [];
  const stations = lineId ? stationsMap[lineId] || [] : [];
  const [formData, setFormData] = useState<Partial<WorkOrder>>({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    assetId: workOrder?.assetId || '',
    assignedTo: workOrder?.assignedTo || '',
    priority: workOrder?.priority || 'medium',
    status: workOrder?.status || 'open',
    type: workOrder?.type || 'corrective',
    dueDate: workOrder?.dueDate || new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assetRes = await http.get('/assets');
        setAssets((assetRes.data as any[]).map(a => ({ ...a, id: a._id ?? a.id })) as Asset[]);
      } catch (err) {
        console.error('Failed to load assets', err);
      }
      try {
        const userRes = await http.get('/users');
        setTechs((userRes.data as any[])
          .filter((u) => u.role === 'technician')
          .map(u => ({ ...u, id: u._id ?? u.id })) as User[]);
      } catch (err) {
        console.error('Failed to load users', err);
      }
      try {
        await fetchDepartments();
      } catch (err) {
        console.error('Failed to load departments', err);
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
    fetchLines(departmentId).catch((err) => {
      console.error('Failed to load lines', err);
    });
  }, [departmentId, fetchLines]);

  useEffect(() => {
    if (!departmentId || !lineId) {
      setStationId('');
      return;
    }
    fetchStations(departmentId, lineId).catch((err) => {
      console.error('Failed to load stations', err);
    });
  }, [departmentId, lineId, fetchStations]);

  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      description: formData.description,
      asset: formData.assetId,
      assignedTo: formData.assignedTo,
      priority: formData.priority,
      status: formData.status,
      type: formData.type,
      dueDate: formData.dueDate,
      departmentId,
      lineId,
      stationId,
    };
    try {
      let res;
      if (workOrder) {
        res = await http.put(`/workorders/${workOrder.id}`, payload);
      } else {
        res = await http.post('/workorders', payload);
      }
      const data = res.data as WorkOrderUpdatePayload;
      if (onSuccess) onSuccess({ ...(data as Partial<WorkOrder>), id: data._id } as WorkOrder);
      addToast(workOrder ? 'Work Order updated' : 'Work Order created', 'success');
    } catch (err) {
      console.error('Failed to submit work order', err);
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
          onChange={(e) => setDepartmentId(e.target.value)}
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
          onChange={(e) => setLineId(e.target.value)}
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
          onChange={(e) => setStationId(e.target.value)}
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
          onChange={(e) => updateField('title', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Asset</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={formData.assetId}
          onChange={(e) => updateField('assetId', e.target.value)}
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
          onChange={(e) => updateField('assignedTo', e.target.value)}
        >
          <option value="">Unassigned</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.priority}
            onChange={(e) => updateField('priority', e.target.value as WorkOrder['priority'])}
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
            onChange={(e) => updateField('status', e.target.value as WorkOrder['status'])}
          >
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={formData.type}
            onChange={(e) => updateField('type', e.target.value as WorkOrder['type'])}
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
            onChange={(e) => updateField('dueDate', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          rows={4}
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
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
