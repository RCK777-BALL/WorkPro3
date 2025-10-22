import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { api } from '@/lib/api';

interface TechnicianRecord {
  id: string;
  name: string;
  role: string;
  certifications: string[];
  shift: string;
  status: string;
}

const fallbackTechnicians: TechnicianRecord[] = [
  {
    id: 'tech-001',
    name: 'Avery Johnson',
    role: 'Maintenance Lead',
    certifications: ['CMRP', 'Lockout/Tagout'],
    shift: 'Day',
    status: 'Open',
  },
  {
    id: 'tech-002',
    name: 'Jordan Chen',
    role: 'Reliability Engineer',
    certifications: ['Vibration Analysis'],
    shift: 'Swing',
    status: 'In Progress',
  },
  {
    id: 'tech-003',
    name: 'Priya Das',
    role: 'Field Technician',
    certifications: ['HVAC', 'EPA 608'],
    shift: 'Night',
    status: 'On Hold',
  },
];

const parseTechnicians = (payload: unknown): TechnicianRecord[] => {
  if (Array.isArray(payload)) {
    return payload as TechnicianRecord[];
  }
  if (payload && typeof payload === 'object') {
    const source = (payload as { data?: unknown; items?: unknown; records?: unknown }).data ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).items ??
      (payload as { data?: unknown; items?: unknown; records?: unknown }).records;
    if (Array.isArray(source)) {
      return source as TechnicianRecord[];
    }
  }
  return [];
};

export default function LaborTechniciansPage() {
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>(fallbackTechnicians);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    api
      .get('/labor')
      .then((response) => {
        if (!active) return;
        const nextTechs = parseTechnicians(response.data);
        if (nextTechs.length) {
          setTechnicians(nextTechs);
        }
      })
      .catch(() => {
        toast.error('Failed to load labor availability');
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

  return (
    <div className="p-6 text-gray-200 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Labor / Technicians</h1>
        <p className="text-sm text-slate-300">
          Review team skills, certifications, and shift coverage for upcoming work.
        </p>
      </div>

      <DataTable
        keyField="id"
        data={technicians}
        isLoading={isLoading}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Role', accessor: 'role' },
          {
            header: 'Certifications',
            accessor: (record) => record.certifications.join(', '),
          },
          { header: 'Shift', accessor: 'shift' },
          {
            header: 'Status',
            accessor: (record) => <StatusBadge status={record.status} size="sm" />,
          },
        ]}
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />
    </div>
  );
}
