import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import PreventiveMaintenanceModal, {
  type PreventiveMaintenanceFormValues,
} from '@/components/maintenance/PreventiveMaintenanceModal';
import { api } from '@/lib/api';

interface PreventiveMaintenanceRecord {
  id: string;
  task: string;
  asset: string;
  frequency: string;
  nextDue: string;
  status: string;
}

const fallbackRecords: PreventiveMaintenanceRecord[] = [
  {
    id: 'pm-001',
    task: 'Inspect air handler filters',
    asset: 'AHU-1',
    frequency: 'Monthly',
    nextDue: '2024-07-01',
    status: 'Open',
  },
  {
    id: 'pm-002',
    task: 'Lubricate conveyor bearings',
    asset: 'Conveyor Line A',
    frequency: 'Quarterly',
    nextDue: '2024-08-15',
    status: 'In Progress',
  },
  {
    id: 'pm-003',
    task: 'Check emergency lighting',
    asset: 'Warehouse 2',
    frequency: 'Annually',
    nextDue: '2024-09-30',
    status: 'Pending Approval',
  },
];

const parseRecords = (payload: unknown): PreventiveMaintenanceRecord[] => {
  if (Array.isArray(payload)) {
    return payload as PreventiveMaintenanceRecord[];
  }
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(data)) {
      return data as PreventiveMaintenanceRecord[];
    }
  }
  return [];
};

export default function PreventiveMaintenancePage() {
  const [records, setRecords] = useState<PreventiveMaintenanceRecord[]>(fallbackRecords);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeRecord, setActiveRecord] = useState<PreventiveMaintenanceRecord | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/pm/summary')
      .then((response) => {
        if (!active) return;
        const nextRecords = parseRecords(response.data);
        if (nextRecords.length) {
          setRecords(nextRecords);
        }
      })
      .catch(() => {
        toast.error('Failed to load preventive maintenance overview');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setActiveRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: PreventiveMaintenanceRecord) => {
    setModalMode('edit');
    setActiveRecord(record);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setActiveRecord(null);
  };

  const handleDelete = (record: PreventiveMaintenanceRecord) => {
    const confirmed = window.confirm(
      `Delete preventive maintenance task "${record.task}"?`
    );

    if (!confirmed) {
      return;
    }

    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    toast.success('Preventive maintenance task removed');
  };

  const handleSubmit = (values: PreventiveMaintenanceFormValues) => {
    if (modalMode === 'edit' && activeRecord) {
      setRecords((prev) =>
        prev.map((item) =>
          item.id === activeRecord.id
            ? { ...activeRecord, ...values }
            : item
        )
      );
      toast.success('Preventive maintenance task updated');
    } else {
      const newRecord: PreventiveMaintenanceRecord = {
        id: uuidv4(),
        ...values,
      };
      setRecords((prev) => [newRecord, ...prev]);
      toast.success('Preventive maintenance task added');
    }

    handleModalClose();
  };

  return (
    <div className="p-6 text-gray-200 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Preventive Maintenance</h1>
        <p className="text-sm text-slate-300">
          Monitor recurring maintenance tasks, schedule adherence, and compliance readiness.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreateModal} variant="primary">
          Add maintenance task
        </Button>
      </div>

      <DataTable
        keyField="id"
        data={records}
        isLoading={isLoading}
        columns={[
          { header: 'Task', accessor: 'task' },
          { header: 'Asset', accessor: 'asset' },
          { header: 'Frequency', accessor: 'frequency' },
          { header: 'Next Due', accessor: 'nextDue' },
          {
            header: 'Status',
            accessor: (record) => <StatusBadge status={record.status} size="sm" />,
          },
          {
            header: 'Actions',
            accessor: (record) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(record);
                  }}
                >
                  <Pencil size={16} />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="px-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(record);
                  }}
                >
                  <Trash2 size={16} />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            ),
            className: 'w-32',
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />

      <PreventiveMaintenanceModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialValues={
          activeRecord
            ? {
                task: activeRecord.task,
                asset: activeRecord.asset,
                frequency: activeRecord.frequency,
                nextDue: activeRecord.nextDue,
                status: activeRecord.status,
              }
            : undefined
        }
        onClose={handleModalClose}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
